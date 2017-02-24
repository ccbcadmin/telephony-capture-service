#!/usr/bin/env node

import * as $ from "../share/constants";
import { ClientSocket, createClient } from "../share/client-socket";
import { ServerSocket } from "../share/server-socket";
import { Queue } from "../share/queue";
import { sleep } from "../share/util";

const routineName = "test-tms-link-reopening";
const _ = require("lodash");

process.on("SIGTERM", () => {
	console.log(`${routineName} terminated`);
	process.exit(0);
});
process.on("SIGINT", () => {
	console.log(`Ctrl-C received. ${routineName} terminated`);
	process.exit(0);
});

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num} = envalid;
const env = envalid.cleanEnv(process.env, {
	TCS_PORT: num(),
	TEST_TRANSMIT_INTERVAL: num(),
	TMS_PORT: num(),
	TMS_QUEUE: str()
});

let tcsClient: ClientSocket;

const nextChar = c => String.fromCharCode(c.charCodeAt(0) + 1);
const dataLength = 50;

let testChar = "\x00";

const connectionHandler = () => {

	let data = Buffer.alloc(dataLength);

	data.fill(testChar);
	testChar = nextChar(testChar);

	if (tcsClient.write(data) === false) {
		console.log("Link to TCS unavailable ... aborting.");
		process.exit(1);
	}

	// Wait a bit then close the circuit
	sleep(500).then(() => { tcsClient.destroy(); });
};

const tmsQueue = new Queue(env.TMS_QUEUE, null, null, null);
sleep(2000)
	.then(tmsQueue.purge)
	.then(() => createClient("pbx=>tcs", "localhost", env.TCS_PORT, connectionHandler))
	.then((client) => tcsClient = client)
	.catch((err) => { console.log('Err: ', JSON.stringify(err, null, 4)); });

const testIterations = 20;
let rxMatrix = Buffer.alloc(testIterations);
rxMatrix.fill(0);

const dataCapture = (data: Buffer) => {

	console.log(`Rx Length: ${data.length}, Data:\n${data.toString('hex')}`);

	// Examine each data value and take note if received
	for (let j = 0; j < testIterations; ++j) {
		for (let k = 0; k < data.length; ++k) {
			if (data[k] === j) {
				rxMatrix[j] = 1;
				break;
			}
		}
	}

	// Check to see if all data has been received
	let allReceived: boolean = true;
	for (let i = 0; i < testIterations; ++i) {
		if (!rxMatrix[i]) {
			allReceived = false;
		}
	}

	if (allReceived) {
		process.exit(0);
	};
};

// Start receiving data from tms-interface
new ServerSocket("tcs=>tms", env.TMS_PORT, dataCapture, null).startListening();

sleep(300000).then(() => {
	console.log("Test Failed: Max time to complete test");
	process.exit(1);
});
