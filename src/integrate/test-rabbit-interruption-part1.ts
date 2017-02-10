#!/usr/bin/env node

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import * as $ from '../share/constants';
import { ClientSocket } from '../share/client-socket';
import { Queue } from '../share/queue';

const routineName = 'test-rabbit-interruption-part1';

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
const testSize = 100000;
const masterTxBuffer = Buffer.alloc(testSize);

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
	TMS_PORT: num()
});

// Load the buffer with random data
for (let index = 0; index < testSize; ++index) {
	masterTxBuffer[index] = index % 256;
}

const tcsSocket = new ClientSocket('PBX->TCS', 'localhost', env.TCS_PORT);

let masterIndex = 0;

const tmsQueue = new Queue(env.TMS_QUEUE, null, null, null);

setTimeout(() => {

	// Start with a clean sheet
	tmsQueue.purge();

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

		// console.log ('masterIndex: ', masterIndex);

		if (masterIndex === testSize) {

			console.log("Tx Complete");
			process.exit(0);
		}
		else if (masterIndex > testSize) {
			console.log('Assertion Failure: masterIndex > testSize');
			process.exit(1);
		}
	}, env.TEST_TRANSMIT_INTERVAL);
}, 2000);
