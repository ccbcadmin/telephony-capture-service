#!/usr/bin/env node
"use strict";
const constants_1 = require('./share/constants');
const client_socket_1 = require('./share/client-socket');
const queue_1 = require('./share/queue');
var TmsInterface;
(function (TmsInterface) {
    const routineName = 'tms-interface';
    const TMS_HOST = '192.168.1.69';
    const TMS_PORT = 6543;
    console.log(`${routineName}: Started`);
    process.on('SIGTERM', () => {
        console.log(`${routineName}: Terminated`);
        process.exit(0);
    });
    const clientSocket = new client_socket_1.ClientSocket('TMS/IF<=>TMS', process.env.TMS_HOST, process.env.TMS_PORT);
    const dataSink = msg => clientSocket.write(msg.content.toString());
    let tmsQueue;
    setTimeout(() => {
        tmsQueue = new queue_1.Queue(constants_1.TMS_QUEUE, dataSink);
    }, process.env.DELAY_STARTUP);
})(TmsInterface = exports.TmsInterface || (exports.TmsInterface = {}));
