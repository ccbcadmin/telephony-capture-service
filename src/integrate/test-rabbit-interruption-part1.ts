#!/usr/bin/env node

import * as $ from "../share/constants";
import { ClientSocket, createClient } from "../share/client-socket";
import { Queue } from "../share/queue";
import { sleep } from "../share/util";
import { trace } from "../Barrel";

const routineName = "test-rabbit-interruption-part1";

// Number of random bytes to send through the channel
const testSize = 100000;
const masterTxBuffer = Buffer.alloc(testSize);

process.on("SIGTERM", () => {
	trace(`${routineName} terminated`);
	process.exit(0);
});
process.on("SIGINT", () => {
	trace(`Ctrl-C received. ${routineName} terminated`);
	process.exit(0);
});

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num} = envalid;
const env = envalid.cleanEnv(process.env, {
	TCS_PORT: num(),
	TEST_TRANSMIT_INTERVAL: num(),
	TMS_PORT: num()
});

// Load the buffer with random data
for (let index = 0; index < testSize; ++index) {
	masterTxBuffer[index] = index % 256;
}

let tcsClient: ClientSocket;

let masterIndex = 0;

const sendData = () => {

	const setIntervalId = setInterval(() => {

		// Vary message lengths from 0 to 99, but truncate the last one
		const dataLength = Math.min(Math.floor(Math.random() * 100), testSize - masterIndex);

		let data = Buffer.alloc(dataLength);

		for (let index = 0; index < dataLength; ++index, ++masterIndex) {
			data[index] = masterTxBuffer[masterIndex];
		}

		if (tcsClient.write(data) === false) {
			trace("Link to TCS unavailable ... aborting.");
			process.exit(1);
		}

		if (masterIndex === testSize) {

			trace("Tx Complete");
			process.exit(0);
		}
		else if (masterIndex > testSize) {
			trace("Assertion Failure: masterIndex > testSize");
			process.exit(1);
		}

	}, env.TEST_TRANSMIT_INTERVAL);
}

// Ensure a clean queue and then create a link to the TCS
const tmsQueue = new Queue(env.TMS_QUEUE);
sleep(2000)
	.then(tmsQueue.purge)
	.then(() => createClient("pbx=>tcs", "localhost", env.TCS_PORT, sendData))
	.then((client: ClientSocket) => tcsClient = client)
	.catch((err) => trace('Err: ', JSON.stringify(err, null, 4)));
