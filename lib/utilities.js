"use strict";
var net = require('net');
var constants_1 = require('./constants');
var ServerSocket = (function () {
    function ServerSocket(serverName, port, dataSink) {
        var _this = this;
        this.handleConnection = function (conn) {
            var remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
            console.log(_this.serverName + ": New client connection from " + remoteAddress);
            var leftOver = '';
            var recordCount = 0;
            var onConnData = function (data) {
                var unprocessedData = leftOver + data;
                var crLfIndexOf = unprocessedData.indexOf(constants_1.CRLF);
                var msg = unprocessedData.match(/\x00\x02\x00\x00\x00\x00(.+)\x0d\x0a/);
                if (msg) {
                    _this.dataSink(msg[1]);
                    leftOver = unprocessedData.slice(crLfIndexOf + 2);
                }
                else {
                    leftOver = unprocessedData.slice(0);
                }
            };
            var onConnClose = function () {
                console.log(_this.serverName + ": Connection from " + remoteAddress + " closed.");
            };
            var onConnError = function (err) {
                console.log(_this.serverName + ": Connection " + remoteAddress + " error: " + err.message);
            };
            conn.on('data', onConnData);
            conn.once('close', onConnClose);
            conn.on('error', onConnError);
        };
        this.serverName = serverName;
        this.port = port;
        this.dataSink = dataSink;
        this.server = net.createServer();
        this.server.on('connection', this.handleConnection);
        this.server.listen(this.port, function () {
            console.log(_this.serverName + ": Listening to: " + _this.server.address());
        });
    }
    return ServerSocket;
}());
exports.ServerSocket = ServerSocket;
