#!/usr/bin/env node
require("rxjs/add/operator/map");
var client_socket_1 = require("../share/client-socket");
var server_socket_1 = require("../share/server-socket");
var queue_1 = require("../share/queue");
const routineName = "test-pbx-to-tms-flow";
const _ = require("lodash");
const net = require("net");
const fs = require("fs");
const dir = require("node-dir");
const eventEmitter = require("events").EventEmitter;
const ee = new eventEmitter;
const envalid = require("envalid");
const { str, num } = envalid;
const txBytes = 1000000;
const masterTxBuffer = Buffer.alloc(txBytes);
const masterRxBuffer = Buffer.alloc(txBytes);
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
for (let index = 0; index < txBytes; ++index) {
    masterTxBuffer[index] = Math.floor(Math.random() * 255);
}
const tcsSocket = new client_socket_1.ClientSocket("pbx=>tcs", "localhost", env.TCS_PORT);
let masterIndex = 0;
const tmsQueue = new queue_1.Queue(env.TMS_QUEUE, null, null, null);
setTimeout(() => {
    tmsQueue.purge();
    const setIntervalId = setInterval(() => {
        const dataLength = Math.min(Math.floor(Math.random() * 100), txBytes - masterIndex);
        let data = Buffer.alloc(dataLength);
        for (let index = 0; index < dataLength; ++index, ++masterIndex) {
            data[index] = masterTxBuffer[masterIndex];
        }
        if (tcsSocket.write(data) === false) {
            console.log("Link to TCS unavailable ... aborting.");
            process.exit(1);
        }
        if (masterIndex === txBytes) {
            clearInterval(setIntervalId);
        }
    }, env.TEST_TRANSMIT_INTERVAL);
}, 2000);
let rxBytes = 0;
const dataCapture = (data) => {
    data.copy(masterRxBuffer, rxBytes, 0);
    rxBytes += data.length;
    if (rxBytes === txBytes) {
        if (masterTxBuffer.equals(masterRxBuffer)) {
            process.exit(0);
        }
        else {
            console.log("Rx / Tx Data Not Consistent");
            process.exit(1);
        }
    }
    else if (rxBytes > txBytes) {
        console.log(`Excessive Data Received, Tx Bytes: ${txBytes} Rx Bytes: ${rxBytes}`);
        process.exit(1);
    }
};
new server_socket_1.ServerSocket("tcs=>tms", env.TMS_PORT, dataCapture).startListening();
