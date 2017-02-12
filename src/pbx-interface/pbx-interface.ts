#!/usr/bin/env node

import * as $ from "../share/constants";
import { ServerSocket } from "../share/server-socket";
import { Queue } from "../share/queue";
const moment = require("moment");

const fs = require("fs");

const routineName = "pbx-interface";
console.log(`Restarting ${routineName}`);

const _ = require("lodash");

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	// Need the docker machine IP to link together the various Microservices
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

const processSmdrMessages = (data: Buffer) => {

	// Gather all the outstanding data
	let unprocessedData = Buffer.concat([leftOver, data], leftOver.length + data.length);

	// If a CRLF is found, then we have a message
	const crLfIndexOf = unprocessedData.indexOf($.CRLF);

	// If no CRLF, then nothing to do
	if (crLfIndexOf < 0) {
		leftOver = Buffer.alloc(unprocessedData.length);
		unprocessedData.copy(leftOver);
	}
	else {
		const smdrMessage = unprocessedData.slice(0, crLfIndexOf + 2);
		databaseQueue.sendToQueue(smdrMessage);

		// Save a copy of each SMDR message to a file
		const saveFileName = "/smdr-data-001/rw" + moment().format("YYMMDD") + ".001";
		fs.appendFile(saveFileName, smdrMessage, (err) => {
			if (err) throw err;
		});

		// Get ready for the next message reception
		leftOver = Buffer.alloc(unprocessedData.length - (crLfIndexOf + 2));
		unprocessedData.copy(leftOver, 0, crLfIndexOf + 2);
	}
};

const dataSink = (data: Buffer) => {

	// Unfiltered data is queued for subsequent transmission to the legacy TMS
	env.TMS_ACTIVE ? tmsQueue.sendToQueue(data) : _.noop;

	// However, only true SMDR data is queued for databaase archiving
	processSmdrMessages(data);
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
tmsQueue = env.TMS_ACTIVE ? new Queue(env.TMS_QUEUE, null, null, tmsQueueDisconnectHandler) : null;

// Always need the database queue
databaseQueue = new Queue(env.DB_QUEUE, null, null, dbQueueDisconnectHandler, dbQueueConnectHandler);

// And finally the server to listen for SMDR messages
const pbxSocket = new ServerSocket("pbx=>tcs", env.TCS_PORT, dataSink, pbxLinkClosed);
