#!/usr/bin/env node

import * as $ from '../share/constants';
import { ServerSocket } from '../share/server-socket';
import { Queue } from '../share/queue';

const routineName = 'pbx-interface';
console.log(`Restarting ${routineName}`);

const _ = require('lodash');

// Ensure the presence of required environment variables
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	// Need the docker machine IP to link together the various Microservices
	TMS_ACTIVE: num(),
	TCS_PORT: num(),
	DB_QUEUE: str(),
	TMS_QUEUE: str()
});

process.on('SIGTERM', () => {
	console.log('Telephony Capture Service: Terminated');
	process.exit(0);
});

process.on('SIGINT', () => {
	console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
	process.exit(0);
});

let tmsQueue;
let databaseQueue;

let leftOver = Buffer.alloc(0);

const queueSmdrMessages = (data: Buffer) => {

	// Gather all the outstanding data
	let unprocessedData = Buffer.concat([leftOver, data]);

	// If a CRLF is found, then we have a message
	const crLfIndexOf = unprocessedData.indexOf($.CRLF);


	// If no CRLF, then nothing to do
	if (crLfIndexOf < 0) {
		leftOver = Buffer.alloc(unprocessedData.length);
		unprocessedData.copy(leftOver);
	}
	else {
		databaseQueue.sendToQueue(unprocessedData.slice(0, crLfIndexOf + 2));
		leftOver = Buffer.alloc(unprocessedData.length - (crLfIndexOf + 2));
		unprocessedData.copy(leftOver, 0, crLfIndexOf + 2);
	}
}

const dataSink = (data: Buffer) => {

	// Unfiltered data is queued for subsequent transmission to the legacy TMS
	env.TMS_ACTIVE ? tmsQueue.sendToQueue(data) : _.noop;

	// However, only true SMDR data is queued for databaase archiving
	queueSmdrMessages(data);
}

// Setup the queue to the TMS if needed
tmsQueue = env.TMS_ACTIVE ? new Queue(env.TMS_QUEUE) : null;

// Always need the database queue
databaseQueue = new Queue(env.DB_QUEUE);

// Start listening for incoming messages
new ServerSocket(routineName, env.TCS_PORT, dataSink);
