import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import * as $ from '../share/constants';
import { ClientSocket } from '../share/client-socket';
import { ServerSocket } from '../share/server-socket';

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
	TMS_PORT: num()
});

// Load the buffer with random data
for (let index = 0; index < testSize; ++index) {
	masterTxBuffer[index] = index % 256;
}

const tcsSocket = new ClientSocket('PBX->TCS', 'localhost', env.TCS_PORT);

let masterIndex = 0;

setTimeout(() => {

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

			console.log("tx Complete");
			process.exit(0);
		}
	}, 2);
}, 1000);
