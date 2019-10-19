#!/usr/bin/env node
// tslint:disable: indent

import { CRLF } from "../share/constants";
import { ServerSocket } from "../share/server-socket";
import { Queue } from "../share/queue";
import moment from "moment";
import assert from "assert";
import _ from "lodash";
import fs from "fs";
import { debugTcs, logError, logFatal, logInfo, logDebug } from "../Barrel";

const routineName = "pbx-interface";

process.on("uncaughtException", async (err) => {

	try {

		console.log("uncaughtException: ", err);

	} catch (err) {
		process.exit(106);
	}
});

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	TMS_ACTIVE: num(),
	TCS_PORT: num(),
	DB_QUEUE: str(),
	TMS_QUEUE: str()
});

class PbxInterface {

	private pbxSocket: ServerSocket | undefined;
	private leftOver = Buffer.alloc(0);
	private tmsQueue: Queue | undefined;
	private databaseQueue: Queue | undefined;

	constructor() {

		try {

			debugTcs(`(${routineName}) Constructor Start`);

			// Setup TMS_QUEUE if the TMS is needed
			this.tmsQueue = env.TMS_ACTIVE ?
				new Queue({
					queueName: env.TMS_QUEUE,
					disconnectHandler: this.tmsQueueDisconnectHandler,
				}) : undefined;

			debugTcs(`(${routineName}) TMS_QUEUE Started`);

			// Always need the database queue
			this.databaseQueue = new Queue({
				queueName: env.DB_QUEUE,
				disconnectHandler: this.dbQueueDisconnectHandler,
				connectHandler: this.dbQueueConnectHandler,
			});

			debugTcs(`(${routineName}) DB_QUEUE Started`);

			// And finally the server to listen for SMDR messages
			this.pbxSocket = new ServerSocket({
				linkName: "pbx=>tcs",
				port: env.TCS_PORT,
				dataSink: this.dataSink,
				disconnectHandler: this.pbxLinkClosed
			});

			process.on("SIGTERM", () => {
				this.pbxSocket ? this.pbxSocket.close() : _.noop;
				logError("TCS Terminated (SIGTERM)");
			});

			debugTcs(`(${routineName}) Constructor Complete`);

		} catch (err) {
			console.log(err);
			throw err;
		}
	}

	private parseSmdrMessages = async (data: Buffer): Promise<void> => {

		try {

			// Gather all outstanding data
			const unprocessedData =
				Buffer.concat(
					[this.leftOver, data],
					this.leftOver.length + data.length);

			// Isolate all smdr messages
			let nextMsg = 0;
			let crLfIndexOf = unprocessedData.indexOf(CRLF, nextMsg);

			while (0 <= crLfIndexOf) {

				const smdrMessage = unprocessedData.slice(nextMsg, crLfIndexOf + 2);

				// Apply a sanity test on the message (first 2 chars must be '20')
				if (smdrMessage.indexOf("20") === 0) {

					// Send to the queue without the CRLF
					this.databaseQueue ?
						this.databaseQueue
							.sendToQueue(
								unprocessedData.slice(nextMsg, crLfIndexOf)) :
						_.noop;

					// Record a copy of each SMDR message to a file
					await fs.promises.appendFile(
						"/smdr-data/smdr-data-001/rw" + moment().format("YYMMDD") + ".001",
						smdrMessage);

				}
				else {
					logDebug("Corrupt message detected:\n", smdrMessage.toString());
				}

				// Move to the next message
				nextMsg = crLfIndexOf + 2;
				crLfIndexOf = unprocessedData.indexOf(CRLF, nextMsg);
			}

			// Maybe some left over for next time
			if (nextMsg < unprocessedData.length) {
				this.leftOver = Buffer.alloc(unprocessedData.length - nextMsg);
				unprocessedData.copy(this.leftOver, 0, nextMsg);
			}
			else {
				this.leftOver = Buffer.alloc(0);
			}
		} catch (err) {
			return Promise.reject(err);
		}
	}

	private dataSink = async (data: Buffer): Promise<void> => {

		try {
			// Unfiltered data is queued for subsequent 
			// transmission to the legacy TMS

			this.tmsQueue ? this.tmsQueue.sendToQueue(data) : _.noop;

			// However, only true SMDR data is queued for databaase archiving
			await this.parseSmdrMessages(data);

		} catch (err) {
			logError(err.message);
		}
	}

	private pbxLinkClosed = () => {
		logError("pbx=>pbx-interface Link Closed");
	}

	private tmsQueueDisconnectHandler = () => {
		logError(`${env.TMS_QUEUE} Channel Down`);
	}

	private dbQueueConnectHandler = () => {

		// Start listening for pbx traffic
		debugTcs("dbQueueConnectHandler()");

		this.pbxSocket ? this.pbxSocket.startListening() : _.noop;
		logError(`${env.DB_QUEUE} Channel Up`);
	}

	private dbQueueDisconnectHandler = () => {

		// If RabbitMQ connection is lost, 
		// then stop pbx reception immediately
		logError(`${env.DB_QUEUE} Down`);
		this.pbxSocket ? this.pbxSocket.close() : _.noop;
	}
}

(async () => {

	try {

		// Insist that a collector directory exists
		assert(
			(await fs.promises.stat("/smdr-data/smdr-data-001")).isDirectory(),
			`Directory /smdr-data/smdr-data-001 Not Found`);

		new PbxInterface();

		logInfo(`(${routineName}) Started`);

	} catch (err) {
		logError(err.message);
		process.exit(0);
	}
})().catch(err => logFatal(err));
