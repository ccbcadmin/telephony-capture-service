#!/usr/bin/env node
"use strict";
require('rxjs/add/operator/map');
const server_socket_1 = require('../share/server-socket');
const routineName = 'test-rabbit-interruption-part2';
const _ = require('lodash');
const net = require('net');
const fs = require('fs');
const dir = require('node-dir');
const eventEmitter = require('events').EventEmitter;
const ee = new eventEmitter;
const envalid = require('envalid');
const { str, num } = envalid;
const testSize = 100000;
process.on('SIGTERM', () => {
    console.log(`${routineName} terminated`);
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});
const env = envalid.cleanEnv(process.env, {
    TMS_PORT: num()
});
setTimeout(() => {
    console.log('Insufficient Data Received: ', rxBytes);
    process.exit(1);
}, 30000);
let rxBytes = 0;
const dataCapture = (data) => {
    rxBytes += data.length;
    if (rxBytes === testSize) {
        console.log('All Data Received');
        process.exit(0);
    }
    else if (rxBytes > testSize) {
        console.log('Excessive Data Received');
        process.exit(1);
    }
};
new server_socket_1.ServerSocket(routineName, env.TMS_PORT, dataCapture);
