#!/usr/bin/env node
// tslint:disable: indent

import { ServerSocket } from "../share/server-socket";
import { trace } from "../Barrel";

const routineName = "tms-simulator";
const envalid = require("envalid");
const { str } = envalid;
const env = envalid.cleanEnv(process.env, {
    TMS_PORT: str()
});

process.on("SIGTERM", () => {
    trace(`${routineName} terminated`);
    process.exit(0);
});
process.on("SIGINT", () => {
    trace(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});

// Just discard the data
const dataDump = (data: Buffer) => {};

// Start listening for incoming messages
new ServerSocket("tcs=>tms", env.TMS_PORT, dataDump).startListening();
