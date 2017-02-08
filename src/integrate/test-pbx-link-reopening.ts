#!/usr/bin/env node

import 'rxjs/add/operator/map';

import * as $ from '../share/constants';
import { ClientSocket } from '../share/client-socket';
import { ServerSocket } from '../share/server-socket';
import { Queue } from '../share/queue';

const routineName = 'test-tms-link-reopening';

const _ = require('lodash');
const net = require('net');
const fs = require('fs');
const dir = require('node-dir');
const eventEmitter = require('events').EventEmitter;
const ee = new eventEmitter;

// Ensure the presence of required environment variables
const envalid = require('envalid');
const { str, num} = envalid;

process.on('SIGTERM', () => {
	console.log(`${routineName} terminated`);
	process.exit(0);
});
process.on('SIGINT', () => {
	console.log(`Ctrl-C received. ${routineName} terminated`);
	process.exit(0);
});

const env = envalid.cleanEnv(process.env, {
	TCS_PORT: num(),
	TEST_TRANSMIT_INTERVAL: num(),
	TMS_PORT: num(),
	TMS_QUEUE: str()
});

const tcsSocket = new ClientSocket('PBX->TCS', 'localhost', env.TCS_PORT);

const tmsQueue = new Queue(env.TMS_QUEUE, null, null, null);



const nextChar = (c) => {
	return String.fromCharCode(c.charCodeAt(0) + 1);
}

let txIteration = 0;
let testChar = '\x00';

setTimeout(() => {

	// Ensure a clean sheet
	tmsQueue.purge();

	const setIntervalId = setInterval(() => {

		const dataLength = 40;

		let data = Buffer.alloc(dataLength);

		data.fill(testChar);
		testChar = nextChar(testChar);

		if (tcsSocket.write(data) === false) {
			console.log('Link to TCS unavailable ... aborting.');
			process.exit(1);
		}

	}, 1000);
}, 2000);

let tmsServer;
const tmsServerShutdown = () => {

	// Detected that the server is shutdown - create a new instance of the TMS server
	tmsServer = new ServerSocket(routineName, env.TMS_PORT, dataCapture, tmsServerShutdown);
}

const testSize = 100;
let rxMatrix = Buffer.alloc(testSize);
rxMatrix.fill(0);

const dataCapture = (data: Buffer) => {

	console.log(data);

	// Examine each data value and take note if received
	for (let j = 0; j < testSize; ++j) {
		for (let k = 0; k < data.length; ++k) {
			if (data[k] === j) {
				rxMatrix[j] = 1;
				break;
			}
		}
	}

	// Check to see if all data has been received
	let allReceived: boolean = true;
	for (let i = 0; i < testSize; ++i) {
		if (!rxMatrix[i]) {
			allReceived = false;
		}
	}

	if (allReceived) {
		process.exit(0);
	}
	else {
		// Else keep going
		tmsServer.close();
	}
};


// Begin the show with the following
tmsServerShutdown ();

setTimeout(() => {
	console.log('Test Failed: Max time to complete test');
	process.exit(1);
}, 150000);
