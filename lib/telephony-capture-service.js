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
    var dataSink = function (msg) {
        smdrQueue.sendToQueue(msg);
        databaseQueue.sendToQueue(msg);
    };
    setTimeout(function () {
        new server_socket_1.ServerSocket('Telephony Capture Service', 9001, dataSink);
    }, 1000);
})(TelephonyCaptureService = exports.TelephonyCaptureService || (exports.TelephonyCaptureService = {}));
