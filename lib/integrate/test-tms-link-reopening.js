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
const tcsSocket = new client_socket_1.ClientSocket('PBX->TCS', 'localhost', env.TCS_PORT);
const tmsQueue = new queue_1.Queue(env.TMS_QUEUE, null, null, null);
const nextChar = (c) => {
    return String.fromCharCode(c.charCodeAt(0) + 1);
};
let txIteration = 0;
let testChar = 'A';
setTimeout(() => {
    tmsQueue.purge();
    const setIntervalId = setInterval(() => {
        const dataLength = 40;
        let data = Buffer.alloc(dataLength);
        data.fill(testChar);
        testChar = nextChar(testChar);
        if (tcsSocket.write(data) === false) {
            console.log('Link to TCS unavailable ... aborting.');
            process.exit(1);
        }
    }, 1000);
}, 2000);
let linkReopens = 0;
let tmsServer;
const tmsServerShutdown = () => {
    if (linkReopens++ < 6) {
        tmsServer = new server_socket_1.ServerSocket(routineName, env.TMS_PORT, dataCapture, tmsServerShutdown);
    }
    else {
        process.exit(0);
    }
};
const dataCapture = (data) => {
    tmsServer.close();
};
tmsServer = new server_socket_1.ServerSocket(routineName, env.TMS_PORT, dataCapture, tmsServerShutdown);
setTimeout(() => {
    console.log('Test Failed: Max time to complete test');
    process.exit(1);
}, 150000);
