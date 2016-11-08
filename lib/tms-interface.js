#!/usr/bin/env node
"use strict";
const constants_1 = require('./share/constants');
const client_socket_1 = require('./share/client-socket');
const queue_1 = require('./share/queue');
var TmsInterface;
(function (TmsInterface) {
    const routineName = 'tms-interface';
    const net = require('net');
    const dockerMachineIp = process.argv[2];
    if (!net.isIP(dockerMachineIp)) {
        console.log(`${routineName}: Invalid Docker Machine IP: ${dockerMachineIp}...aborting`);
        process.exit(-1);
    }
    const TMS_HOST = '192.168.1.69';
    const TMS_PORT = 6543;
    console.log(`${routineName}: Started`);
    process.on('SIGTERM', () => {
        console.log(`${routineName}: Terminated`);
        process.exit(0);
    });
    const clientSocket = new client_socket_1.ClientSocket('TMS/IF<=>TMS', TMS_HOST, TMS_PORT);
    const dataSink = msg => clientSocket.write(msg.content.toString());
    let tmsQueue;
    setTimeout(() => {
        tmsQueue = new queue_1.Queue(constants_1.TMS_QUEUE, dockerMachineIp, dataSink);
    }, 10000);
})(TmsInterface = exports.TmsInterface || (exports.TmsInterface = {}));
