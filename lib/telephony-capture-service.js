"use strict";
const constants_1 = require('./share/constants');
const server_socket_1 = require('./share/server-socket');
const queue_1 = require('./share/queue');
const utility_1 = require('./share/utility');
var TelephonyCaptureService;
(function (TelephonyCaptureService) {
    const _ = require('lodash');
    const routineName = 'telephony-capture-service';
    const envalid = require('envalid');
    const { str, num } = envalid;
    const env = envalid.cleanEnv(process.env, {
        DOCKER_MACHINE_IP: str(),
        TMS_ACTIVE: num(),
        TCS_PORT: num()
    });
    const net = require('net');
    if (!net.isIP(env.DOCKER_MACHINE_IP)) {
        console.log(`${routineName}; Invalid Docker Machine IP: ${env.DOCKER_MACHINE_IP}...aborting.`);
        process.exit(-1);
    }
    process.on('SIGTERM', () => {
        console.log('Telephony Capture Service: Terminated');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
        process.exit(0);
    });
    let tmsQueue;
    let databaseQueue;
    let leftOver = '';
    const queueCompleteMessages = (data) => {
        const unprocessedData = leftOver + data.toString();
        const crLfIndexOf = unprocessedData.indexOf(constants_1.CRLF);
        const msg = unprocessedData.match(/\x00\x02\x00\x00\x00\x00(.+)\x0d\x0a/);
        if (msg) {
            databaseQueue.sendToQueue(msg[1]);
            leftOver = unprocessedData.slice(crLfIndexOf + 2);
        }
        else {
            leftOver = unprocessedData.slice(0);
        }
    };
    const dataSink = (data) => {
        env.TMS_ACTIVE ? tmsQueue.sendToQueue(data.toString()) : _.noop;
        queueCompleteMessages(data);
    };
    if (env.TMS_ACTIVE) {
        tmsQueue = new queue_1.Queue(constants_1.TMS_QUEUE);
    }
    databaseQueue = new queue_1.Queue(constants_1.DATABASE_QUEUE);
    new server_socket_1.ServerSocket(routineName, utility_1.networkIP, env.TCS_PORT, dataSink);
})(TelephonyCaptureService = exports.TelephonyCaptureService || (exports.TelephonyCaptureService = {}));
