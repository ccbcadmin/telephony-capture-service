"use strict";
var constants_1 = require('./constants');
var server_socket_1 = require('./share/server-socket');
var queue_1 = require('./share/queue');
var TelephonyCaptureService;
(function (TelephonyCaptureService) {
    var amqp = require('amqplib/callback_api');
    var receive = require('child_process');
    var child = receive.fork('./lib/legacy-call-management-interface');
    var net = require('net');
    process.on('SIGTERM', function () {
        console.log('Telephony Capture Service: Terminated');
        child.kill('SIGTERM');
        process.exit(0);
    });
    process.on('SIGINT', function () {
        console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
        child.kill('SIGTERM');
        process.exit(0);
    });
    var smdrQueue = new queue_1.Queue(constants_1.SMDR_QUEUE, null);
    var databaseQueue = new queue_1.Queue(constants_1.DATABASE_QUEUE, null);
    var leftOver = '';
    var queueCompleteMessages = function (data) {
        var unprocessedData = leftOver + data;
        var crLfIndexOf = unprocessedData.indexOf(constants_1.CRLF);
        var msg = unprocessedData.match(/\x00\x02\x00\x00\x00\x00(.+)\x0d\x0a/);
        if (msg) {
            databaseQueue.sendToQueue(msg[1]);
            leftOver = unprocessedData.slice(crLfIndexOf + 2);
        }
        else {
            leftOver = unprocessedData.slice(0);
        }
    };
    var dataSink = function (data) {
        smdrQueue.sendToQueue(data);
        queueCompleteMessages(data);
    };
    setTimeout(function () {
        new server_socket_1.ServerSocket('Telephony Capture Service', 9001, dataSink);
    }, 1000);
})(TelephonyCaptureService = exports.TelephonyCaptureService || (exports.TelephonyCaptureService = {}));
