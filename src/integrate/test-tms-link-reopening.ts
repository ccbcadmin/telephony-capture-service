#!/usr/bin/env node
// tslint:disable: indent

import _ from "lodash";
import { ClientSocket } from "../share/client-socket";
import { ServerSocket } from "../share/server-socket";
import { Queue } from "../share/queue";
import { sleep } from "../share/util";

const routineName = "test-tms-link-reopening";

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;

process.on("SIGTERM", () => {
	console.log(`${routineName} terminated`);
	process.exit(0);
});
process.on("SIGINT", () => {
	console.log(`Ctrl-C received. ${routineName} terminated`);
	process.exit(0);
});

const env = envalid.cleanEnv(process.env, {
	TCS_PORT: num(),
	TEST_TRANSMIT_INTERVAL: num(),
	TMS_PORT: num(),
	TMS_QUEUE: str()
});

let tcsClient: ClientSocket;

const nextChar = (c: string) => {
	return String.fromCharCode(c.charCodeAt(0) + 1);
};

let testChar = " ";

const sendData = () => {

	const setIntervalId = setInterval(() => {

		const dataLength = 40;

		let data = Buffer.alloc(dataLength);

		data.fill(testChar);
		testChar = nextChar(testChar);

		console.log("data sent: ", data);

		if (tcsClient.write(data) === false) {
			console.log("Link to TCS unavailable ... aborting.");
			process.exit(1);
		}
	}, 1000);
}

// Ensure the TMS queue is empty, then open the link
const tmsQueue = new Queue(env.TMS_QUEUE);
sleep(2000)
	.then(tmsQueue.purge)
	.then(() => tcsClient =
		new ClientSocket({
			linkName: "pbx=>tcs",
			host: "localhost",
			port: env.TCS_PORT,
			connectHandler: sendData
		}))
	.catch((err) => { console.log("Err: ", JSON.stringify(err, null, 4)); });

const startListening = () => { tmsServer.startListening(); };

const testSize = 100;
let rxMatrix = Buffer.alloc(testSize);
rxMatrix.fill(0);

const dataSink = async (data: Buffer): Promise<void> => {

	console.log(data);

	// Examine each data value and take note if received
	for (let j = 0; j < testSize; ++j) {
		for (let k = 0; k < data.length; ++k) {
			if (data[k] === j) {
				rxMatrix[j] = 1;
				break;
			}
		}
	}

	// Check to see if all data has been received
	let allReceived: boolean = true;
	for (let i = 0; i < testSize; ++i) {
		if (!rxMatrix[i]) {
			allReceived = false;
		}
	}

	if (allReceived) {
		process.exit(0);
	}
	else {
		// Else keep going
		tmsServer.close();
	}
};

// dataSink examines incoming data and closes the link.
// When the link is closed, startListening () is called again.
const tmsServer = new ServerSocket({
	linkName: "tcs=>tms",
	port: env.TMS_PORT,
	dataSink,
	disconnectHandler: startListening
});

// Begin the show
startListening();

sleep(150000).then(() => {
	console.log("Test Failed: Max time to complete test");
	process.exit(1);
});
