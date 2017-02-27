#!/usr/bin/env node

import { Queue } from "../share/queue";
import { ClientSocket } from "../share/client-socket";

const routineName = "tms-interface";

const _ = require("lodash");
const moment = require("moment");
const net = require("net");
let linkName = "tcs=>tms";

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	TMS_PORT: num(),
	TMS_HOST: str(),
	TMS_QUEUE: str()
});

process.on("SIGTERM", () => {
	console.log(`${routineName}: Terminated`);
	process.exit(0);
});

let tmsQueue = null;
let tmsClient: ClientSocket;

// Any data received from the queue, immediately forward on to the TMS
const dataSink = msg => tmsClient.write(msg);

const openQueueChannel = () => { tmsQueue = new Queue(env.TMS_QUEUE, dataSink); }

const closeQueueChannel = () => {
	tmsQueue ? tmsQueue.close() : _.noop;
}

// When the link opens, start taking data from the queue, and forward it on to the TMS
tmsClient = new ClientSocket("tcs=>tms", env.TMS_HOST, env.TMS_PORT, openQueueChannel, closeQueueChannel);

console.log(`${routineName}: Started`);
