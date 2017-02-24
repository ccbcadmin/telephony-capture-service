#!/usr/bin/env node

import * as $ from "../share/constants";
import { ServerSocket } from "../share/server-socket";
import { sleep } from "../share/util";

const routineName = "test-rabbit-interruption-part2";

const _ = require("lodash");

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num} = envalid;

// Number of random bytes to send through the channel
const testSize = 100000;

process.on("SIGTERM", () => {
	console.log(`${routineName} terminated`);
	process.exit(0);
});
process.on("SIGINT", () => {
	console.log(`Ctrl-C received. ${routineName} terminated`);
	process.exit(0);
});

const env = envalid.cleanEnv(process.env, {
	TMS_PORT: num()
});

// A limited time to allow for all data to be received
sleep(30000)
	.then(() => {
		console.log("Insufficient Data Received: ", rxBytes);
		process.exit(1);
	});

let rxBytes = 0;
const dataCapture = (data: Buffer) => {

	rxBytes += data.length;

	if (rxBytes === testSize) {
		console.log("All Data Received");
		process.exit(0);
	}
	else if (rxBytes > testSize) {
		// More data received than expected
		console.log("Excessive Data Received");
		process.exit(1);
	}
};

// Start listening for messages directed to the TMS
new ServerSocket("tcs=>tms", env.TMS_PORT, dataCapture).startListening();
