#!/usr/bin/env node
// tslint:disable: indent

import { ServerSocket } from "../share/server-socket";
import { debugTcs, logError } from "../Barrel";

const routineName = "tms-simulator";
const envalid = require("envalid");
const { str } = envalid;
const env = envalid.cleanEnv(process.env, {
    TMS_PORT: str()
});

process.on("SIGTERM", () => {
    debugTcs(`${routineName} terminated`);
    process.exit(0);
});
process.on("SIGINT", () => {
    debugTcs(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});

// Just discard the data
const dataSink = async (data: Buffer) => { };

// Start listening for incoming messages
new ServerSocket({
    linkName: "tcs=>tms",
    port: env.TMS_PORT,
    dataSink
}).startListening();

logError (`${routineName} Started`);
