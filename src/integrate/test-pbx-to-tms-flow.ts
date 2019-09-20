#!/usr/bin/env node
// tslint:disable: indent

import * as $ from "../share/constants";
const moment = require("moment");
const _ = require("lodash");
import { ClientSocket, createClient } from "../share/client-socket";
import { ServerSocket } from "../share/server-socket";
import { Queue } from "../share/queue";
import { sleep } from "../share/util";
import { trace } from "../Barrel";

const routineName = "test-pbx-to-tms-flow";

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;

// Number of random bytes to send through the channel
const testSize = 1000000;
const masterTxBuffer = Buffer.alloc(testSize);
const masterRxBuffer = Buffer.alloc(testSize);

process.on("SIGTERM", () => {
	trace(`${routineName} terminated`);
	process.exit(0);
});
process.on("SIGINT", () => {
	trace(`Ctrl-C received. ${routineName} terminated`);
	process.exit(0);
});

const env = envalid.cleanEnv(process.env, {
	TCS_PORT: num(),
	TEST_TRANSMIT_INTERVAL: num(),
	TMS_PORT: num(),
	TMS_QUEUE: str()
});

let rxBytes = 0;
let txBytes = 0;
let tcsClient: ClientSocket;

const sendData = () => {

	const setIntervalId = setInterval(() => {

		// Vary message lengths from 0 to 99, but truncate the last one
		const dataLength = Math.min(Math.floor(Math.random() * 100), testSize - txBytes);

		let data = Buffer.alloc(dataLength);

		for (let index = 0; index < dataLength; ++index, ++txBytes) {
			data[index] = masterTxBuffer[txBytes];
		}

		if (tcsClient.write(data) === false) {
			trace("Link to TCS unavailable ... aborting.");
			process.exit(1);
		}

		if (txBytes === testSize) {
			clearInterval(setIntervalId);
		}
	}, env.TEST_TRANSMIT_INTERVAL);
}

// Load the buffer with random data
for (let index = 0; index < testSize; ++index) {
	masterTxBuffer[index] = Math.floor(Math.random() * 255);
}

// Ensure a clean queue and then create a link to send data to the TCS
const tmsQueue = new Queue(env.TMS_QUEUE);
sleep(2000)
	// Ensure an empty queue
	.then(tmsQueue.purge)
	.then(() => createClient("pbx=>tcs", "localhost", env.TCS_PORT, sendData))
	.then((client: ClientSocket) => tcsClient = client)
	.catch((err) => { trace('Err: ', JSON.stringify(err, null, 4)); });

const dataCapture = (data: Buffer) => {

	data.copy(masterRxBuffer, rxBytes, 0);
	rxBytes += data.length;

	if (rxBytes === testSize) {
		if (masterTxBuffer.equals(masterRxBuffer)) {
			process.exit(0);
		}
		else {
			trace("Rx / Tx Data Not Consistent");
			process.exit(1);
		}
	}
	else if (rxBytes > testSize) {
		// More data received than expected
		trace(`Excessive Data Received, Tx Bytes: ${testSize} Rx Bytes: ${rxBytes}`);
		process.exit(1);
	}
};

// Start listening for messages directed to the TMS
new ServerSocket("tcs=>tms", env.TMS_PORT, dataCapture).startListening();

// Set an upper limit for the test to complete
sleep(600000).then(() => { trace("Insufficient Data Received: ", rxBytes); process.exit(1); });
