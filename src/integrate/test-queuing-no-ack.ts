#!/usr/bin/env node

import * as $ from "../share/constants";
import { Queue } from "../share/queue";
import { sleep } from "../share/util";

const routineName = "test-queuing-no-ack";

const _ = require("lodash");
const moment = require("moment");

console.log(`${routineName}: Started`);

process.on("SIGTERM", () => {
	console.log(`${routineName}: Terminated`);
	process.exit(0);
});

// Every 'failModule' messages will not be acked
let failModule = 12;
let receiveCount = 0;

const testMsgCount = 60;

// Keep track of which messages are received (dups are possible)
let rxMatrix = new Array(testMsgCount);
rxMatrix.fill(false);

let rxQueue;

// 'dataSink' returns a boolean indicating success or not
const dataSink = msg => {

	console.log("Received Msg: ", msg);

	++receiveCount;
	if (receiveCount % failModule !== 0) {

		// Record when a message has been received
		rxMatrix[msg[0]] = true;

		return true;
	} else {
		// Now simulate the complete shutdown of the channel to the queue...
		rxQueue.close();
		rxQueue = null;

		// ... which is later restarted
		sleep(2000).then (()=>rxQueue = new Queue("TEST_QUEUE", dataSink));

		return false;
	}
};

// Create an artificial msg of this size
const msgLength = 40;

// Send to and receive from the same queue
rxQueue = new Queue("TEST_QUEUE", dataSink);

// Wait to connect to RabbitMQ and then send some data
const txQueue = new Queue("TEST_QUEUE");
sleep(2000)
	.then (()=>txQueue.purge())
	.then(() => {

		for (let i = 0; i < testMsgCount; ++i) {

			let sendBuffer = Buffer.alloc(msgLength);

			for (let j = 0; j < msgLength; ++j) {
				sendBuffer[j] = i;
			}
			txQueue.sendToQueue(sendBuffer);
		}
	})
	.catch((err) => { console.log('Err: ', JSON.stringify(err, null, 4));});

// Wait for a while, then check several times to see if all is received
sleep(30000)
	.then(() => {

		let recheckCounter = 0;

		setInterval(() => {

			console.log("Check If All Messages Received");

			let allReceived = true;

			// Check that all messages have been received
			for (let i = 0; i < testMsgCount; ++i) {
				if (rxMatrix[i] !== true) {
					allReceived = false;
					break;
				}
			}
			if (allReceived === true) {
				console.log("All Messages Received");
				process.exit(0);
			}
			if (18 < ++recheckCounter) {
				console.log(`Not All Messages Received`);
				process.exit(1);
			}
		}, 5000);
	});
