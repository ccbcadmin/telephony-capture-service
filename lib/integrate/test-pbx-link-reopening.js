#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_socket_1 = require("../share/client-socket");
const server_socket_1 = require("../share/server-socket");
const queue_1 = require("../share/queue");
const util_1 = require("../share/util");
const Barrel_1 = require("../Barrel");
const routineName = "test-tms-link-reopening";
process.on("SIGTERM", () => {
    Barrel_1.trace(`${routineName} terminated`);
    process.exit(0);
});
process.on("SIGINT", () => {
    Barrel_1.trace(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TCS_PORT: num(),
    TEST_TRANSMIT_INTERVAL: num(),
    TMS_PORT: num(),
    TMS_QUEUE: str()
});
let tcsClient;
const nextChar = (c) => String.fromCharCode(c.charCodeAt(0) + 1);
const dataLength = 50;
let testChar = "\x00";
const connectionHandler = () => {
    let data = Buffer.alloc(dataLength);
    data.fill(testChar);
    testChar = nextChar(testChar);
    if (tcsClient.write(data) === false) {
        Barrel_1.trace("Link to TCS unavailable ... aborting.");
        process.exit(1);
    }
    util_1.sleep(500).then(() => { tcsClient.destroy(); });
};
const tmsQueue = new queue_1.Queue(env.TMS_QUEUE);
util_1.sleep(2000)
    .then(tmsQueue.purge)
    .then(() => client_socket_1.createClient("pbx=>tcs", "localhost", env.TCS_PORT, connectionHandler))
    .then((client) => tcsClient = client)
    .catch((err) => { Barrel_1.trace('Err: ', JSON.stringify(err, null, 4)); });
const testIterations = 20;
let rxMatrix = Buffer.alloc(testIterations);
rxMatrix.fill(0);
const dataCapture = (data) => {
    Barrel_1.trace(`Rx Length: ${data.length}, Data:\n${data.toString('hex')}`);
    for (let j = 0; j < testIterations; ++j) {
        for (let k = 0; k < data.length; ++k) {
            if (data[k] === j) {
                rxMatrix[j] = 1;
                break;
            }
        }
    }
    let allReceived = true;
    for (let i = 0; i < testIterations; ++i) {
        if (!rxMatrix[i]) {
            allReceived = false;
        }
    }
    if (allReceived) {
        process.exit(0);
    }
    ;
};
new server_socket_1.ServerSocket("tcs=>tms", env.TMS_PORT, dataCapture, undefined).startListening();
util_1.sleep(300000).then(() => {
    Barrel_1.trace("Test Failed: Max time to complete test");
    process.exit(1);
});
