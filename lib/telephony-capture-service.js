"use strict";
const constants_1 = require('./share/constants');
const server_socket_1 = require('./share/server-socket');
const queue_1 = require('./share/queue');
const utility_1 = require('./share/utility');
var TelephonyCaptureService;
(function (TelephonyCaptureService) {
    const routineName = 'telephony-capture-service';
    const net = require('net');
    if (!net.isIP(process.env.DOCKER_MACHINE_IP)) {
        console.log(`${routineName}; Invalid Docker Machine IP: ${process.env.DOCKER_MACHINE_IP}.  Aborting.`);
        process.exit(-1);
    }
    const isTmsEnabled = process.env.TMS_ACTIVE === "true" ? true : false;
    let tmsInterfaceChildProcess;
    let databaseChildProcess;
    const receive = require('child_process');
    if (isTmsEnabled) {
        tmsInterfaceChildProcess = receive.fork(`./lib/tms-interface`);
        console.log('tmsInterfaceChildProcess Started');
    }
    databaseChildProcess = receive.fork(`./lib/database-interface`);
    console.log('databaseChildProcess Started');
    process.on('SIGTERM', () => {
        console.log('Telephony Capture Service: Terminated');
        tmsInterfaceChildProcess.kill('SIGTERM');
        databaseChildProcess.kill('SIGTERM');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
        tmsInterfaceChildProcess.kill('SIGTERM');
        databaseChildProcess.kill('SIGTERM');
        process.exit(0);
    });
    let tmsQueue;
    let databaseQueue;
    let leftOver = '';
    const queueCompleteMessages = (data) => {
        const unprocessedData = leftOver + data;
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
    const dataSink = data => {
        if (isTmsEnabled) {
            tmsQueue.sendToQueue(data);
        }
        queueCompleteMessages(data);
    };
    setTimeout(() => {
        if (isTmsEnabled) {
            tmsQueue = new queue_1.Queue(constants_1.TMS_QUEUE, null);
        }
        databaseQueue = new queue_1.Queue(constants_1.DATABASE_QUEUE, null);
        new server_socket_1.ServerSocket('Telephony Capture Service', utility_1.networkIP, 3456, dataSink);
    }, process.env.DELAY_STARTUP);
})(TelephonyCaptureService = exports.TelephonyCaptureService || (exports.TelephonyCaptureService = {}));
