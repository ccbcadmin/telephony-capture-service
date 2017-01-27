#!/usr/bin/env node

import 'rxjs/add/operator/map';

import * as $ from '../share/constants';
import { ClientSocket } from '../share/client-socket';
import { ServerSocket } from '../share/server-socket';
import { Queue } from '../share/queue';

const routineName = 'test-pbx-to-tms-flow';

const _ = require('lodash');
const net = require('net');
const fs = require('fs');
const dir = require('node-dir');
const eventEmitter = require('events').EventEmitter;
const ee = new eventEmitter;

// Ensure the presence of required environment variables
const envalid = require('envalid');
const { str, num} = envalid;

// Number of random bytes to send through the channel
const testSize = 1000000;
const masterTxBuffer = Buffer.alloc(testSize);
const masterRxBuffer = Buffer.alloc(testSize);

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
	TMS_PORT: num(),
	TMS_QUEUE: str()
});

// Load the buffer with random data
for (let index = 0; index < testSize; ++index) {
	masterTxBuffer[index] = Math.floor(Math.random() * 255);
}

const tcsSocket = new ClientSocket('PBX->TCS', 'localhost', env.TCS_PORT);

let masterIndex = 0;

const tmsQueue = new Queue(env.TMS_QUEUE);

setTimeout(() => {

	// Ensure nothing hanging around from a previous test
	tmsQueue.purge ();

	const setIntervalId = setInterval(() => {

		// Vary message lengths from 0 to 99, but truncate the last one
		const dataLength = Math.min(Math.floor(Math.random() * 100), testSize - masterIndex);

		let data = Buffer.alloc(dataLength);

		for (let index = 0; index < dataLength; ++index, ++masterIndex) {
			data[index] = masterTxBuffer[masterIndex];
		}

		if (tcsSocket.write(data) === false) {
			console.log('Link to TCS unavailable ... aborting.');
			process.exit(1);
		}

		if (masterIndex === testSize) {
			clearInterval(setIntervalId);
		}
	}, 2);
}, 2000);

let rxIndex = 0;
const dataCapture = (data: Buffer) => {

	data.copy(masterRxBuffer, rxIndex, 0);
	rxIndex += data.length;

	if (rxIndex === testSize) {
		if (masterTxBuffer.equals(masterRxBuffer)) {
			process.exit(0);
		}
		else {
			console.log('Rx / Tx Data Not Consistent');
			process.exit(1);
		}
	}
	else if (rxIndex > testSize) {
		// More data received than expected
		console.log ('Excessive Data Received');
		process.exit (1);
	}
};

// Start listening for messages directed to the TMS
new ServerSocket(routineName, env.TMS_PORT, dataCapture);
