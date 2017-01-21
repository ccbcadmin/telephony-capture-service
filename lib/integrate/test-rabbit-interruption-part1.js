#!/usr/bin/env node
"use strict";
require("rxjs/add/operator/map");
const client_socket_1 = require("../share/client-socket");
const queue_1 = require("../share/queue");
const routineName = 'test-rabbit-interruption-part1';
const _ = require('lodash');
const net = require('net');
const fs = require('fs');
const dir = require('node-dir');
const eventEmitter = require('events').EventEmitter;
const ee = new eventEmitter;
const envalid = require('envalid');
const { str, num } = envalid;
const testSize = 1000000;
const masterTxBuffer = Buffer.alloc(testSize);
const masterRxBuffer = Buffer.alloc(testSize);
process.on('SIGTERM', () => {
    console.log(`${routineName} terminated`);
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});
const env = envalid.cleanEnv(process.env, {
    TCS_PORT: num(),
    TMS_PORT: num()
});
for (let index = 0; index < testSize; ++index) {
    masterTxBuffer[index] = index % 256;
}
const tcsSocket = new client_socket_1.ClientSocket('PBX->TCS', 'localhost', env.TCS_PORT);
let masterIndex = 0;
console.log('Clear the TMS_QUEUE');
const tmsQueue = new queue_1.Queue(env.TMS_QUEUE, () => true);
setTimeout(() => {
    tmsQueue.close();
    const setIntervalId = setInterval(() => {
        const dataLength = Math.min(Math.floor(Math.random() * 100), testSize - masterIndex);
        let data = Buffer.alloc(dataLength);
        for (let index = 0; index < dataLength; ++index, ++masterIndex) {
            data[index] = masterTxBuffer[masterIndex];
        }
        if (tcsSocket.write(data) === false) {
            console.log('Link to TCS unavailable ... aborting.');
            process.exit(1);
        }
        if (masterIndex === testSize) {
            console.log("tx Complete");
            process.exit(0);
        }
    }, 2);
}, 1000);
