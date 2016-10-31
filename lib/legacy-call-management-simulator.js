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
    var leftOver = '';
    var dataDump = function (data) {
        var unprocessedData = leftOver.slice(0) + data.slice(0);
        var crLfIndexOf = unprocessedData.indexOf(constants_1.CRLF);
        var msg = unprocessedData.match(/\x00\x02\x00\x00\x00\x00(.+)\x0d\x0a/);
        if (msg) {
            process.stdout.write(msg[1] + constants_1.CRLF);
            leftOver = unprocessedData.slice(crLfIndexOf + 2);
        }
        else {
            leftOver = unprocessedData.slice(0);
        }
    };
    new server_socket_1.ServerSocket('Legacy Call Management Simulator', 9002, dataDump);
})(LegacyCallManagementSimulator = exports.LegacyCallManagementSimulator || (exports.LegacyCallManagementSimulator = {}));
