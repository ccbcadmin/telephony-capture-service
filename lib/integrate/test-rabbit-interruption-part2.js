#!/usr/bin/env node
"use strict";
require("rxjs/add/operator/map");
const client_socket_1 = require("../share/client-socket");
const server_socket_1 = require("../share/server-socket");
const routineName = 'test-rabbit-interruption-part2';
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
let rxIndex = 0;
const dataCapture = (data) => {
    rxIndex += data.length;
    if (rxIndex === testSize) {
        console.log('All Data Received');
        process.exit(0);
    }
    else if (rxIndex > testSize) {
        console.log('Excessive Data Received');
        process.exit(1);
    }
};
new server_socket_1.ServerSocket(routineName, env.TMS_PORT, dataCapture);
