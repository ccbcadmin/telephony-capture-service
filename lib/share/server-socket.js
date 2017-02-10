"use strict";
class ServerSocket {
    constructor(serverName, port, dataSink, linkCloseHandler = null) {
        this.net = require('net');
        this.connection = null;
        this.handleConnection = conn => {
            const remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
            console.log(`${this.serverName}: Connection Open: ${remoteAddress}`);
            const onClose = () => {
                console.log(`${this.serverName}: Connection Closed: from ${remoteAddress}`);
            };
            const onError = err => {
                console.log(`${this.serverName}: Connection ${remoteAddress} error: ${err.message}`);
            };
            conn.addListener('data', this.dataSink);
            conn.once('close', onClose);
            conn.addListener('error', onError);
            this.connection = conn;
        };
        this.startListening = () => {
            console.log(`${this.serverName}: Start Listening`);
            this.server.addListener('connection', this.handleConnection);
            this.server.listen(this.port, () => {
                console.log(`${this.serverName}: Listening on: ${JSON.stringify(this.server.address())}`);
            });
        };
        this.stopListening = () => {
            console.log(`${this.serverName}: Stop Listening`);
            this.server.removeListener('connection', this.handleConnection);
            this.server.close();
        };
        this.close = () => {
            if (this.connection) {
                this.connection.end();
                this.connection = null;
            }
            this.stopListening();
        };
        this.serverName = serverName;
        this.port = port;
        this.dataSink = dataSink;
        this.linkCloseHandler = linkCloseHandler;
        this.server = this.net.createServer();
        if (linkCloseHandler) {
            this.server.addListener('close', this.linkCloseHandler);
        }
    }
}
exports.ServerSocket = ServerSocket;
