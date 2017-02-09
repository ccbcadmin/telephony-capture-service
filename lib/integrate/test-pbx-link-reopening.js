#!/usr/bin/env node
"use strict";
require('rxjs/add/operator/map');
const client_socket_1 = require('../share/client-socket');
const server_socket_1 = require('../share/server-socket');
const queue_1 = require('../share/queue');
const routineName = 'test-tms-link-reopening';
const _ = require('lodash');
const net = require('net');
const fs = require('fs');
const dir = require('node-dir');
const eventEmitter = require('events').EventEmitter;
const ee = new eventEmitter;
const envalid = require('envalid');
const { str, num } = envalid;
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
    TEST_TRANSMIT_INTERVAL: num(),
    TMS_PORT: num(),
    TMS_QUEUE: str()
});
let tcsSocket;
const tmsQueue = new queue_1.Queue(env.TMS_QUEUE, null, null, null);
const nextChar = c => String.fromCharCode(c.charCodeAt(0) + 1);
const dataLength = 40;
let testChar = '\x00';
const connectionHandler = () => {
    let data = Buffer.alloc(dataLength);
    data.fill(testChar);
    testChar = nextChar(testChar);
    if (tcsSocket.write(data) === false) {
        console.log('Link to TCS unavailable ... aborting.');
        process.exit(1);
    }
    console.log('Destroy the link');
    setTimeout(() => { tcsSocket.destroy(); }, 200);
};
setTimeout(() => {
    tmsQueue.purge();
    const setIntervalId = setInterval(() => {
        tcsSocket = new client_socket_1.ClientSocket('PBX->TCS', 'localhost', env.TCS_PORT, connectionHandler);
    }, 1000);
}, 10000);
const testIterations = 20;
let rxMatrix = Buffer.alloc(testIterations);
rxMatrix.fill(0);
const dataCapture = (data) => {
    console.log(data);
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
new server_socket_1.ServerSocket(routineName, env.TMS_PORT, dataCapture, null);
setTimeout(() => {
    console.log('Test Failed: Max time to complete test');
    process.exit(1);
}, 150000);
