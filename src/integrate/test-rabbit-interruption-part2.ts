#!/usr/bin/env node
// tslint:disable: indent

import _ from "lodash";
import { ServerSocket } from "../share/server-socket";
import { sleep } from "../share/util";
import { debugTcs } from "../Barrel";

const routineName = "test-rabbit-interruption-part2";

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;

// Number of random bytes to send through the channel
const testSize = 100000;

process.on("SIGTERM", () => {
	debugTcs(`${routineName} terminated`);
	process.exit(0);
});
process.on("SIGINT", () => {
	debugTcs(`Ctrl-C received. ${routineName} terminated`);
	process.exit(0);
});

const env = envalid.cleanEnv(process.env, {
	TMS_PORT: num()
});

// A limited time to allow for all data to be received
sleep(30000)
	.then(() => {
		debugTcs("Insufficient Data Received: ", rxBytes);
		process.exit(1);
	});

let rxBytes = 0;
const dataSink = async (data: Buffer): Promise<void> => {

	rxBytes += data.length;

	if (rxBytes === testSize) {
		debugTcs("All Data Received");
		process.exit(0);
	}
	else if (rxBytes > testSize) {
		// More data received than expected
		debugTcs("Excessive Data Received");
		process.exit(1);
	}
};

// Start listening for messages directed to the TMS
new ServerSocket({
	linkName: "tcs=>tms",
	port: env.TMS_PORT,
	dataSink,
}).startListening();
