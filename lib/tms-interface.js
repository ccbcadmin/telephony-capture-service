#!/usr/bin/env node
"use strict";
const constants_1 = require('./share/constants');
const client_socket_1 = require('./share/client-socket');
const queue_1 = require('./share/queue');
var TmsInterface;
(function (TmsInterface) {
    const routineName = 'tms-interface';
    const envalid = require('envalid');
    const { str, num } = envalid;
    const env = envalid.cleanEnv(process.env, {
        TMS_HOST: str(),
        TMS_PORT: num(),
        STARTUP_DELAY: num()
    });
    const TMS_HOST = '192.168.1.69';
    const TMS_PORT = 6543;
    console.log(`${routineName}: Started`);
    process.on('SIGTERM', () => {
        console.log(`${routineName}: Terminated`);
        process.exit(0);
    });
    const clientSocket = new client_socket_1.ClientSocket('TMS/IF<=>TMS', env.TMS_HOST, env.TMS_PORT);
    const dataSink = msg => clientSocket.write(msg.content.toString());
    let tmsQueue;
    setTimeout(() => {
        tmsQueue = new queue_1.Queue(constants_1.TMS_QUEUE, dataSink);
    }, env.STARTUP_DELAY);
})(TmsInterface = exports.TmsInterface || (exports.TmsInterface = {}));
