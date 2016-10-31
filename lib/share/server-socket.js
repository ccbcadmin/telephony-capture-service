"use strict";
var ServerSocket = (function () {
    function ServerSocket(serverName, port, dataSink) {
        var _this = this;
        this.net = require('net');
        this.handleConnection = function (conn) {
            var remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
            console.log(_this.serverName + ": New client connection from " + remoteAddress);
            var onClose = function () {
                console.log(_this.serverName + ": Connection from " + remoteAddress + " closed.");
            };
            var onError = function (err) {
                console.log(_this.serverName + ": Connection " + remoteAddress + " error: " + err.message);
            };
            conn.on('data', _this.dataSink);
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
