#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_socket_1 = require("../share/server-socket");
const util_1 = require("../share/util");
const routineName = "test-rabbit-interruption-part2";
const _ = require("lodash");
const envalid = require("envalid");
const { str, num } = envalid;
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
util_1.sleep(30000)
    .then(() => {
    console.log("Insufficient Data Received: ", rxBytes);
    process.exit(1);
});
let rxBytes = 0;
const dataCapture = (data) => {
    rxBytes += data.length;
    if (rxBytes === testSize) {
        console.log("All Data Received");
        process.exit(0);
    }
    else if (rxBytes > testSize) {
        console.log("Excessive Data Received");
        process.exit(1);
    }
};
new server_socket_1.ServerSocket("tcs=>tms", env.TMS_PORT, dataCapture).startListening();
