#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const _ = require("lodash");
const client_socket_1 = require("../share/client-socket");
const server_socket_1 = require("../share/server-socket");
const queue_1 = require("../share/queue");
const util_1 = require("../share/util");
const Barrel_1 = require("../Barrel");
const routineName = "test-pbx-to-tms-flow";
const envalid = require("envalid");
const { str, num } = envalid;
const testSize = 1000000;
const masterTxBuffer = Buffer.alloc(testSize);
const masterRxBuffer = Buffer.alloc(testSize);
process.on("SIGTERM", () => {
    Barrel_1.trace(`${routineName} terminated`);
    process.exit(0);
});
process.on("SIGINT", () => {
    Barrel_1.trace(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});
const env = envalid.cleanEnv(process.env, {
    TCS_PORT: num(),
    TEST_TRANSMIT_INTERVAL: num(),
    TMS_PORT: num(),
    TMS_QUEUE: str()
});
let rxBytes = 0;
let txBytes = 0;
let tcsClient;
const sendData = () => {
    const setIntervalId = setInterval(() => {
        const dataLength = Math.min(Math.floor(Math.random() * 100), testSize - txBytes);
        let data = Buffer.alloc(dataLength);
        for (let index = 0; index < dataLength; ++index, ++txBytes) {
            data[index] = masterTxBuffer[txBytes];
        }
        if (tcsClient.write(data) === false) {
            Barrel_1.trace("Link to TCS unavailable ... aborting.");
            process.exit(1);
        }
        if (txBytes === testSize) {
            clearInterval(setIntervalId);
        }
    }, env.TEST_TRANSMIT_INTERVAL);
};
for (let index = 0; index < testSize; ++index) {
    masterTxBuffer[index] = Math.floor(Math.random() * 255);
}
const tmsQueue = new queue_1.Queue(env.TMS_QUEUE);
util_1.sleep(2000)
    .then(tmsQueue.purge)
    .then(() => client_socket_1.createClient("pbx=>tcs", "localhost", env.TCS_PORT, sendData))
    .then((client) => tcsClient = client)
    .catch((err) => { Barrel_1.trace('Err: ', JSON.stringify(err, null, 4)); });
const dataCapture = (data) => {
    data.copy(masterRxBuffer, rxBytes, 0);
    rxBytes += data.length;
    if (rxBytes === testSize) {
        if (masterTxBuffer.equals(masterRxBuffer)) {
            process.exit(0);
        }
        else {
            Barrel_1.trace("Rx / Tx Data Not Consistent");
            process.exit(1);
        }
    }
    else if (rxBytes > testSize) {
        Barrel_1.trace(`Excessive Data Received, Tx Bytes: ${testSize} Rx Bytes: ${rxBytes}`);
        process.exit(1);
    }
};
new server_socket_1.ServerSocket("tcs=>tms", env.TMS_PORT, dataCapture).startListening();
util_1.sleep(600000).then(() => { Barrel_1.trace("Insufficient Data Received: ", rxBytes); process.exit(1); });
