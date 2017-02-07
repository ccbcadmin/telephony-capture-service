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

// Number of random bytes to send through the channel

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
let testChar = 'A';

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

// Do the test 'n' times to ensure that each time the link reopens
let linkReopens = 0;

let tmsServer;
const tmsServerShutdown = () => {

	if (linkReopens++ < 6) {
		tmsServer = new ServerSocket(routineName, env.TMS_PORT, dataCapture, tmsServerShutdown);
	}
	else {
		// Sufficient iterations - test passed
		process.exit(0);
	}
}

const dataCapture = (data: Buffer) => {

	// we receive something...now shutdown the TMS server
	tmsServer.close();
};

tmsServer = new ServerSocket(routineName, env.TMS_PORT, dataCapture, tmsServerShutdown);

setTimeout(() => {
	console.log('Test Failed: Max time to complete test');
	process.exit(1);
}, 150000);
