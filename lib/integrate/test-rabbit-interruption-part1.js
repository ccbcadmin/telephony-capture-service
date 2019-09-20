#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_socket_1 = require("../share/client-socket");
const queue_1 = require("../share/queue");
const util_1 = require("../share/util");
const routineName = "test-rabbit-interruption-part1";
const testSize = 100000;
const masterTxBuffer = Buffer.alloc(testSize);
process.on("SIGTERM", () => {
    console.log(`${routineName} terminated`);
    process.exit(0);
});
process.on("SIGINT", () => {
    console.log(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TCS_PORT: num(),
    TEST_TRANSMIT_INTERVAL: num(),
    TMS_PORT: num()
});
for (let index = 0; index < testSize; ++index) {
    masterTxBuffer[index] = index % 256;
}
let tcsClient;
let masterIndex = 0;
const sendData = () => {
    const setIntervalId = setInterval(() => {
        const dataLength = Math.min(Math.floor(Math.random() * 100), testSize - masterIndex);
        let data = Buffer.alloc(dataLength);
        for (let index = 0; index < dataLength; ++index, ++masterIndex) {
            data[index] = masterTxBuffer[masterIndex];
        }
        if (tcsClient.write(data) === false) {
            console.log("Link to TCS unavailable ... aborting.");
            process.exit(1);
        }
        if (masterIndex === testSize) {
            console.log("Tx Complete");
            process.exit(0);
        }
        else if (masterIndex > testSize) {
            console.log("Assertion Failure: masterIndex > testSize");
            process.exit(1);
        }
    }, env.TEST_TRANSMIT_INTERVAL);
};
const tmsQueue = new queue_1.Queue(env.TMS_QUEUE);
util_1.sleep(2000)
    .then(tmsQueue.purge)
    .then(() => client_socket_1.createClient("pbx=>tcs", "localhost", env.TCS_PORT, sendData))
    .then((client) => tcsClient = client)
    .catch((err) => console.log('Err: ', JSON.stringify(err, null, 4)));
