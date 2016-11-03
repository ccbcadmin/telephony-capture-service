"use strict";
const constants_1 = require('./constants');
const server_socket_1 = require('./share/server-socket');
var LegacyCallManagementSimulator;
(function (LegacyCallManagementSimulator) {
    const net = require('net');
    process.on('SIGTERM', () => {
        console.log('LegacyCallManagementSimulator terminated');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        console.log("Ctrl-C received. LegacyCallManagementSimulator terminating");
        process.exit(0);
    });
    let leftOver = '';
    const dataDump = (data) => {
        const unprocessedData = leftOver.slice(0) + data.slice(0);
        const crLfIndexOf = unprocessedData.indexOf(constants_1.CRLF);
        const msg = unprocessedData.match(/\x00\x02\x00\x00\x00\x00(.+)\x0d\x0a/);
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
