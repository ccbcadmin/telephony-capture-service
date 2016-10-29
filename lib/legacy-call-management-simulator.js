"use strict";
var constants_1 = require('./constants');
var server_socket_1 = require('./share/server-socket');
var LegacyCallManagementSimulator;
(function (LegacyCallManagementSimulator) {
    var net = require('net');
    process.on('SIGTERM', function () {
        console.log('LegacyCallManagementSimulator terminated');
        process.exit(0);
    });
    process.on('SIGINT', function () {
        console.log("Ctrl-C received. LegacyCallManagementSimulator terminating");
        process.exit(0);
    });
    var dataDump = function (msg) {
        process.stdout.write(msg + constants_1.CRLF);
    };
    new server_socket_1.ServerSocket('Legacy Call Management Simulator', 9002, dataDump);
})(LegacyCallManagementSimulator = exports.LegacyCallManagementSimulator || (exports.LegacyCallManagementSimulator = {}));
