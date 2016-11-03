"use strict";
const constants_1 = require('./constants');
const server_socket_1 = require('./share/server-socket');
const queue_1 = require('./share/queue');
var TelephonyCaptureService;
(function (TelephonyCaptureService) {
    const amqp = require('amqplib/callback_api');
    const receive = require('child_process');
    const child = receive.fork('./lib/legacy-call-management-interface');
    const net = require('net');
    process.on('SIGTERM', () => {
        console.log('Telephony Capture Service: Terminated');
        child.kill('SIGTERM');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
        child.kill('SIGTERM');
        process.exit(0);
    });
    const smdrQueue = new queue_1.Queue(constants_1.SMDR_QUEUE, null);
    const databaseQueue = new queue_1.Queue(constants_1.DATABASE_QUEUE, null);
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
        smdrQueue.sendToQueue(data);
        queueCompleteMessages(data);
    };
    setTimeout(() => {
        new server_socket_1.ServerSocket('Telephony Capture Service', 9001, dataSink);
    }, 1000);
})(TelephonyCaptureService = exports.TelephonyCaptureService || (exports.TelephonyCaptureService = {}));
