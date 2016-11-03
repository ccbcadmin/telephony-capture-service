"use strict";
class ServerSocket {
    constructor(serverName, port, dataSink) {
        this.net = require('net');
        this.handleConnection = conn => {
            const remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
            console.log(`${this.serverName}: New client connection from ${remoteAddress}`);
            const onClose = () => {
                console.log(`${this.serverName}: Connection from ${remoteAddress} closed.`);
            };
            const onError = err => {
                console.log(`${this.serverName}: Connection ${remoteAddress} error: ${err.message}`);
            };
            conn.on('data', this.dataSink);
            conn.once('close', onClose);
            conn.on('error', onError);
        };
        this.serverName = serverName;
        this.port = port;
        this.dataSink = dataSink;
        this.server = this.net.createServer();
        this.server.on('connection', this.handleConnection);
        this.server.listen(this.port, () => {
            console.log(`${this.serverName}: Listening to: ${this.server.address()}`);
        });
    }
}
exports.ServerSocket = ServerSocket;
