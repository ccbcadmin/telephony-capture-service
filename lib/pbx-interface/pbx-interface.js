"use strict";
const $ = require('../share/constants');
const server_socket_1 = require('../share/server-socket');
const queue_1 = require('../share/queue');
const util_1 = require('../share/util');
var TelephonyCaptureService;
(function (TelephonyCaptureService) {
    const routineName = 'pbx-interface';
    console.log(`Restarting ${routineName}`);
    const _ = require('lodash');
    const envalid = require('envalid');
    const { str, num } = envalid;
    const env = envalid.cleanEnv(process.env, {
        DOCKER_HOST_IP: str(),
        TMS_ACTIVE: num(),
        TCS_PORT: num()
    });
    const net = require('net');
    if (!net.isIP(env.DOCKER_HOST_IP)) {
        console.log(`${routineName}; Invalid Docker Machine IP: ${env.DOCKER_HOST_IP}...aborting.`);
        process.exit(-1);
    }
    process.on('SIGINT', () => {
        console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
        process.exit(0);
    });
    let tmsQueue;
    let databaseQueue;
    let leftOver = '';
    const queueCompleteMessages = (data) => {
        const unprocessedData = leftOver + data.toString();
        const crLfIndexOf = unprocessedData.indexOf($.CRLF);
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
    tmsQueue = env.TMS_ACTIVE ? new queue_1.Queue($.TMS_QUEUE) : null;
    databaseQueue = new queue_1.Queue($.DATABASE_QUEUE);
    console.log('networdIP: ', util_1.networkIP);
    new server_socket_1.ServerSocket(routineName, util_1.networkIP, env.TCS_PORT, dataSink);
})(TelephonyCaptureService = exports.TelephonyCaptureService || (exports.TelephonyCaptureService = {}));