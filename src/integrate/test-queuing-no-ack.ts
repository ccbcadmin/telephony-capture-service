#!/usr/bin/env node
// tslint:disable: indent

import _ from "lodash";
import { Queue } from "../share/queue";
import { sleep } from "../share/util";
import { debugTcs, setTimeoutPromise } from "../Barrel";
import { Message } from "amqplib";

const routineName = "test-queuing-no-ack";

debugTcs(`${routineName}: Started`);

process.on("SIGTERM", () => {
	debugTcs(`${routineName}: Terminated`);
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
const dataSink = async (msg: Message): Promise<boolean> => {

	debugTcs("Received Msg: ", msg);

	++receiveCount;
	if (receiveCount % failModule !== 0) {

		// Record when a message has been received
		rxMatrix[msg.content[0]] = true;

		return true;
	} else {
		// Now simulate the complete shutdown of the channel to the queue...
		rxQueue ? rxQueue.close() : _.noop;
		rxQueue = undefined;

		// ... which is later restarted
		await setTimeoutPromise(2000);
		rxQueue = new Queue({ queueName: "TEST_QUEUE", consumer: dataSink });

		return false;
	}
};

// Create an artificial msg of this size
const msgLength = 40;

// Send to and receive from the same queue
rxQueue = new Queue({ queueName: "TEST_QUEUE", consumer: dataSink });

// Wait to connect to RabbitMQ and then send some data
const txQueue = new Queue({ queueName: "TEST_QUEUE" });
sleep(2000)
	.then(() => txQueue.purge())
	.then(() => {

		for (let i = 0; i < testMsgCount; ++i) {

			let sendBuffer = Buffer.alloc(msgLength);

			for (let j = 0; j < msgLength; ++j) {
				sendBuffer[j] = i;
			}
			txQueue.sendToQueue(sendBuffer);
		}
	})
	.catch((err) => { debugTcs("Err: ", JSON.stringify(err, null, 4)); });

// Wait for a while, then check several times to see if all is received
sleep(30000)
	.then(() => {

		let recheckCounter = 0;

		setInterval(() => {

			debugTcs("Check If All Messages Received");

			let allReceived = true;

			// Check that all messages have been received
			for (let i = 0; i < testMsgCount; ++i) {
				if (rxMatrix[i] !== true) {
					allReceived = false;
					break;
				}
			}
			if (allReceived === true) {
				debugTcs("All Messages Received");
				process.exit(0);
			}
			if (18 < ++recheckCounter) {
				debugTcs(`Not All Messages Received`);
				process.exit(1);
			}
		}, 5000);
	});
