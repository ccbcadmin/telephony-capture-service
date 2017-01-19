"use strict";
require("rxjs/add/operator/map");
const client_socket_1 = require("../share/client-socket");
const server_socket_1 = require("../share/server-socket");
const routineName = 'test-pbx-to-tms-flow';
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
let rxIndex = 0;
const dataCapture = (data) => {
    data.copy(masterRxBuffer, rxIndex, 0);
    rxIndex += data.length;
    if (rxIndex === testSize) {
        if (masterTxBuffer.equals(masterRxBuffer)) {
            console.log('Test was successful');
            process.exit(0);
        }
        else {
            console.log('Rx / Tx Data Not Consistent');
            process.exit(1);
        }
    }
    else if (rxIndex > testSize) {
        console.log('Excessive Data Received');
        process.exit(1);
    }
};
new server_socket_1.ServerSocket(routineName, env.TMS_PORT, dataCapture);