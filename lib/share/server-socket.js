"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ServerSocket {
    constructor(linkName, port, dataSink, linkCloseHandler = null) {
        this.net = require("net");
        this.connection = null;
        this.handleConnection = connection => {
            const remoteAddress = connection.remoteAddress + ":" + connection.remotePort;
            console.log(`${this.linkName}: Connection Open: ${remoteAddress}`);
            const onClose = () => {
                console.log(`${this.linkName}: Connection Closed: from ${remoteAddress}`);
                connection.removeListener("data", this.dataSink);
                connection.removeListener("error", onError);
            };
            const onError = err => {
                console.log(`${this.linkName}: Connection ${remoteAddress} error: ${err.message}`);
            };
            connection.addListener("data", this.dataSink);
            connection.prependOnceListener("close", onClose);
            connection.addListener("error", onError);
            this.connection = connection;
        };
        this.startListening = () => {
            this.server.addListener("connection", this.handleConnection);
            this.server.listen({
                host: '0.0.0.0',
                port: this.port
            }, () => {
                console.log(`${this.linkName}: Listening on: ${this.port}`);
            });
        };
        this.stopListening = () => {
            console.log(`${this.linkName}: Stop Listening`);
            this.server.removeListener("connection", this.handleConnection);
            this.server.close();
        };
        this.close = () => {
            if (this.connection) {
                this.connection.end();
                this.connection = null;
            }
            this.stopListening();
        };
        this.linkName = linkName;
        this.port = port;
        this.dataSink = dataSink;
        this.linkCloseHandler = linkCloseHandler;
        this.server = this.net.createServer();
        if (linkCloseHandler) {
            this.server.addListener("close", this.linkCloseHandler);
        }
    }
}
exports.ServerSocket = ServerSocket;
