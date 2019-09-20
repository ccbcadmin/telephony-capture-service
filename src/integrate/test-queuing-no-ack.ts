#!/usr/bin/env node

import * as $ from "../share/constants";
import { Queue } from "../share/queue";
import { sleep } from "../share/util";
import { trace } from "../Barrel";

const routineName = "test-queuing-no-ack";

const _ = require("lodash");
const moment = require("moment");

trace(`${routineName}: Started`);

process.on("SIGTERM", () => {
	trace(`${routineName}: Terminated`);
	process.exit(0);
});

// Every 'failModule' messages will not be acked
let failModule = 12;
let receiveCount = 0;

const testMsgCount = 60;

// Keep track of which messages are received (dups are possible)
let rxMatrix = new Array(testMsgCount);
rxMatrix.fill(false);

let rxQueue: Queue | undefined;

// 'dataSink' returns a boolean indicating success or not
const dataSink = async (msg: Buffer): Promise<boolean> => {

	trace("Received Msg: ", msg);

	++receiveCount;
	if (receiveCount % failModule !== 0) {

		// Record when a message has been received
		rxMatrix[msg[0]] = true;

		return true;
	} else {
		// Now simulate the complete shutdown of the channel to the queue...
		rxQueue ? rxQueue.close() : _.noop;
		rxQueue = undefined;

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
	.catch((err) => { trace('Err: ', JSON.stringify(err, null, 4));});

// Wait for a while, then check several times to see if all is received
sleep(30000)
	.then(() => {

		let recheckCounter = 0;

		setInterval(() => {

			trace("Check If All Messages Received");

			let allReceived = true;

			// Check that all messages have been received
			for (let i = 0; i < testMsgCount; ++i) {
				if (rxMatrix[i] !== true) {
					allReceived = false;
					break;
				}
			}
			if (allReceived === true) {
				trace("All Messages Received");
				process.exit(0);
			}
			if (18 < ++recheckCounter) {
				trace(`Not All Messages Received`);
				process.exit(1);
			}
		}, 5000);
	});
