"use strict";
var constants_1 = require('../constants');
var ServerSocket = (function () {
    function ServerSocket(serverName, port, dataSink) {
        var _this = this;
        this.net = require('net');
        this.handleConnection = function (conn) {
            var remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
            console.log(_this.serverName + ": New client connection from " + remoteAddress);
            var leftOver = '';
            var recordCount = 0;
            var onData = function (data) {
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
            var onClose = function () {
                console.log(_this.serverName + ": Connection from " + remoteAddress + " closed.");
            };
            var onError = function (err) {
                console.log(_this.serverName + ": Connection " + remoteAddress + " error: " + err.message);
            };
            conn.on('data', onData);
            conn.once('close', onClose);
            conn.on('error', onError);
        };
        this.serverName = serverName;
        this.port = port;
        this.dataSink = dataSink;
        this.server = this.net.createServer();
        this.server.on('connection', this.handleConnection);
        this.server.listen(this.port, function () {
            console.log(_this.serverName + ": Listening to: " + _this.server.address());
        });
    }
    return ServerSocket;
}());
exports.ServerSocket = ServerSocket;
