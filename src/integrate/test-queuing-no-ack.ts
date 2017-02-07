#!/usr/bin/env node

import * as $ from '../share/constants';
import { Queue } from '../share/queue';
import 'rxjs/Rx';
import { Observable } from 'rxjs/Observable';

const routineName = 'test-queuing-no-ack';

const _ = require('lodash');
const moment = require('moment');

console.log(`${routineName}: Started`);

process.on('SIGTERM', () => {
	console.log(`${routineName}: Terminated`);
	process.exit(0);
});

// Every 'failModule' messages will receive no ack
let failModule = 12;
let receiveCount = 0;

const testMsgCount = 200;

// Keep track of which messages are received (dups are possible)
let rxMatrix = new Array(testMsgCount);
rxMatrix.fill(false);

// 'dataSink' returns a boolean indicating success or not
const dataSink = msg => {

	++receiveCount;
	if (receiveCount % failModule !== 0) {

		// Record when a message has been received
		rxMatrix[msg[0]] = true;

		return true;
	} else {
		// Now simulate the complete shutdown of a process
		rxQueue.close();
		rxQueue = null;

		// ... which is later restarted
		setTimeout(() => {
			rxQueue = new Queue('TEST_QUEUE', null, dataSink, null);
		}, 2000);

		return false;
	}
}

let rxQueue;
let txQueue = new Queue('TEST_QUEUE', null, null, null);

// Create an artificial msg of this size
const msgLength = 40;

// Send to and receive from the same queue
rxQueue = new Queue('TEST_QUEUE', null, dataSink, null);

// Wait to connect to RabbitMQ and then send some data
setTimeout(() => {

	txQueue.purge();
	for (let i = 0; i < testMsgCount; ++i) {

		let sendBuffer = Buffer.alloc(msgLength);

		for (let j = 0; j < msgLength; ++j) {
			sendBuffer[j] = i;
		}
		txQueue.sendToQueue(sendBuffer);
	}
}, 2000);

// Wait 60 seconds and then check 12 times if all done (every 5 seconds)
setTimeout(() => {

	let recheckCounter = 0;

	setInterval(() => {

		console.log ('Check If All Messages Received');
		
		let allReceived = true;

		// Check that all messages have been received
		for (let i = 0; i < testMsgCount; ++i) {
			if (rxMatrix[i] !== true) {
				allReceived = false;
				break;
			}
		}
		if (allReceived === true) {
			console.log('All Messages Received');
			process.exit(0);
		}
		if (12 < ++recheckCounter) {
			console.log(`Not All Messages Received`);
			process.exit(1);
		}
	}, 5000);
}, 60000);
