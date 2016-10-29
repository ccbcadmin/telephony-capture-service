#!/usr/bin/env node
"use strict";
var constants_1 = require('./constants');
var client_socket_1 = require('./share/client-socket');
var queue_1 = require('./share/queue');
var LegacyCallMananagementInterface;
(function (LegacyCallMananagementInterface) {
    var routineName = 'Legacy Call Management Inteface';
    var HOST = '127.0.0.1';
    var CRLF = '\r\n';
    console.log(routineName + ": Started");
    process.on('SIGTERM', function () {
        console.log(routineName + ": Terminated");
        process.exit(0);
    });
    var clientSocket = new client_socket_1.ClientSocket('LCMSIM<=>LCM', HOST, 9002);
    var dataSink = function (msg) {
        return clientSocket.write(constants_1.SMDR_PREAMBLE + msg.content.toString() + CRLF);
    };
    var smdrQueue = new queue_1.Queue(constants_1.SMDR_QUEUE, dataSink);
})(LegacyCallMananagementInterface = exports.LegacyCallMananagementInterface || (exports.LegacyCallMananagementInterface = {}));
