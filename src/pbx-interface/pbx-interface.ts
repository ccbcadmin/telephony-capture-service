#!/usr/bin/env node

import * as $ from "../share/constants";
import { ServerSocket } from "../share/server-socket";
import { Queue } from "../share/queue";
const moment = require("moment");

const fs = require("fs");

const routineName = "pbx-interface";
console.log(`Restarting ${routineName}`);

const _ = require("lodash");
const assert = require('assert');

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	TMS_ACTIVE: num(),
	TCS_PORT: num(),
	DB_QUEUE: str(),
	TMS_QUEUE: str()
});

process.on("SIGTERM", () => {
	pbxSocket.close();
	console.log("TCS Terminated (SIGTERM)");
});

let tmsQueue;
let databaseQueue;

let leftOver = Buffer.alloc(0);

const parseSmdrMessages = (data: Buffer) => {

	// Gather all outstanding data
	let unprocessedData = Buffer.concat([leftOver, data], leftOver.length + data.length);

	// Isolate all smdr messages
	let nextMsg = 0;
	let crLfIndexOf = unprocessedData.indexOf($.CRLF, nextMsg);

	while (0 <= crLfIndexOf) {

		const smdrMessage = unprocessedData.slice(nextMsg, crLfIndexOf + 2);

		// Apply a sanity test on the message (first 2 chars must be '20')
		if (smdrMessage.indexOf("20") === 0) {

			// Send to the queue without the CRLF
			databaseQueue.sendToQueue(unprocessedData.slice(nextMsg, crLfIndexOf));

			// Record a copy of each SMDR message to a file
			fs.appendFile("/smdr-data/smdr-data-001/rw" + moment().format("YYMMDD") + ".001",
				smdrMessage, 
				(err) => {
					if (err) throw err;
				});
		}
		else {
			console.log('Corrupt message detected:\n', smdrMessage.toString());
		}

		// Move to the next message
		nextMsg = crLfIndexOf + 2;
		crLfIndexOf = unprocessedData.indexOf($.CRLF, nextMsg);
	}

	// Maybe some left over for next time
	if (nextMsg < unprocessedData.length) {
		leftOver = Buffer.alloc(unprocessedData.length - nextMsg);
		unprocessedData.copy(leftOver, 0, nextMsg);
	}
	else {
		leftOver = Buffer.alloc(0);
	}
};

const dataSink = (data: Buffer) => {

	// Unfiltered data is queued for subsequent transmission to the legacy TMS
	env.TMS_ACTIVE ? tmsQueue.sendToQueue(data) : _.noop;

	// However, only true SMDR data is queued for databaase archiving
	parseSmdrMessages(data);
};

const pbxLinkClosed = () => {
	console.log("pbx=>pbx-interface Link Closed");
};

const tmsQueueDisconnectHandler = () => {
	console.log(`${env.TMS_QUEUE} Channel Down`);
};

const dbQueueConnectHandler = () => {

	// Start listening for pbx traffic
	pbxSocket.startListening();
	console.log(`${env.DB_QUEUE} Channel Up`);
};

const dbQueueDisconnectHandler = () => {

	// If RabbitMQ connection is lost, then stop pbx reception immediately
	console.log(`${env.DB_QUEUE} Down`);
	pbxSocket.close();
};

// Setup the queue to the TMS (if needed)
tmsQueue = env.TMS_ACTIVE ? new Queue(env.TMS_QUEUE, null, tmsQueueDisconnectHandler) : null;

// Always need the database queue
databaseQueue = new Queue(env.DB_QUEUE, null, dbQueueDisconnectHandler, dbQueueConnectHandler);

// And finally the server to listen for SMDR messages
const pbxSocket = new ServerSocket("pbx=>tcs", env.TCS_PORT, dataSink, pbxLinkClosed);
