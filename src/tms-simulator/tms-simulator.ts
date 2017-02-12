#!/usr/bin/env node

import * as $ from "../share/constants";
import { ServerSocket } from "../share/server-socket";

const routineName = "tms-simulator";
const envalid = require("envalid");
const { str } = envalid;
const env = envalid.cleanEnv(process.env, {
    TMS_PORT: str()
});

process.on("SIGTERM", () => {
    console.log(`${routineName} terminated`);
    process.exit(0);
});
process.on("SIGINT", () => {
    console.log(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});

// Just discard the data
const dataDump = (data) => {};

// Start listening for incoming messages
new ServerSocket("tcs=>tms", env.TMS_PORT, dataDump).startListening();
