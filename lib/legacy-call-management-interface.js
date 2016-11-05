#!/usr/bin/env node
"use strict";
const constants_1 = require('./constants');
const client_socket_1 = require('./share/client-socket');
const queue_1 = require('./share/queue');
var LegacyCallMananagementInterface;
(function (LegacyCallMananagementInterface) {
    const routineName = 'Legacy Call Management Inteface';
    const HOST = '192.168.1.69';
    const PORT = 6543;
    console.log(`${routineName}: Started`);
    process.on('SIGTERM', () => {
        console.log(`${routineName}: Terminated`);
        process.exit(0);
    });
    const clientSocket = new client_socket_1.ClientSocket('LCMSIM<=>LCM', HOST, PORT);
    const dataSink = msg => clientSocket.write(msg.content.toString());
    const smdrQueue = new queue_1.Queue(constants_1.SMDR_QUEUE, dataSink);
})(LegacyCallMananagementInterface = exports.LegacyCallMananagementInterface || (exports.LegacyCallMananagementInterface = {}));
