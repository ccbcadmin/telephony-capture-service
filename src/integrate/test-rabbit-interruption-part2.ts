#!/usr/bin/env node

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import * as $ from '../share/constants';
import { ClientSocket } from '../share/client-socket';
import { ServerSocket } from '../share/server-socket';

const routineName = 'test-rabbit-interruption-part2';

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

let rxIndex = 0;
const dataCapture = (data: Buffer) => {

	rxIndex += data.length;

	if (rxIndex === testSize) {
		console.log ('All Data Received');
        process.exit(0);
	}
	else if (rxIndex > testSize) {
		// More data received than expected
		console.log ('Excessive Data Received');
		process.exit (1);
	}
};

// Start listening for messages directed to the TMS
new ServerSocket(routineName, env.TMS_PORT, dataCapture);
