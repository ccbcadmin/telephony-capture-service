#!/usr/bin/env node
// tslint:disable: indent

import moment from "moment";
import _ from "lodash";
import assert from "assert";

import { Queue } from "../share/queue";
import { ClientSocket } from "../share/client-socket";
import { logError } from "../Barrel";
import { Message } from "amqplib";

const routineName = "tms-interface";

const net = require("net");
const linkName = "tcs=>tms";

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	TMS_PORT: num(),
	TMS_HOST: str(),
	TMS_QUEUE: str()
});

process.on("SIGTERM", () => {
	logError(`${routineName}: Terminated`);
	process.exit(0);
});

export class TmsInterface {

	private tmsQueue: Queue | undefined;
	private tmsClient: ClientSocket;

	constructor() {

		this.tmsClient = new ClientSocket({
			linkName,
			host: env.TMS_HOST,
			port: env.TMS_PORT,
			connectHandler: this.openQueueChannel,
			disconnectHandler: this.closeQueueChannel});
	}

	// Data received from the queue is immediately forward to the TMS
	private dataSink = (msg: Message): Promise<boolean> =>
		Promise.resolve(this.tmsClient.write(msg.content))

	private openQueueChannel = () => {

		// When the link opens, take from the queue and forward to the TMS
		this.tmsQueue =
			new Queue({
				queueName: env.TMS_QUEUE,
				consumer: this.dataSink,
			});
	}

	private closeQueueChannel = () => {
		this.tmsQueue != null ? this.tmsQueue.close() : _.noop;
	}
}

try {
	new TmsInterface();
	logError(`${routineName} Started`);

} catch (err) {
	logError(err.message);
	process.exit(0);
}
