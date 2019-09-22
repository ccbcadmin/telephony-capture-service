"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Barrel_1 = require("../Barrel");
class ServerSocket {
    constructor(params) {
        this.params = params;
        this.net = require("net");
        this.connection = null;
        this.handleConnection = (connection) => {
            const { dataSink, linkName } = this.params;
            const remoteAddress = connection.remoteAddress + ":" + connection.remotePort;
            Barrel_1.debugTcs(`${linkName}: Connection Open: ${remoteAddress}`);
            const onClose = () => {
                Barrel_1.debugTcs(`${linkName}: Connection Closed: from ${remoteAddress}`);
                connection.removeListener("data", dataSink);
                connection.removeListener("error", onError);
            };
            const onError = (err) => {
                Barrel_1.debugTcs(`${this.params.linkName}: Connection ${remoteAddress} error: ${err.message}`);
            };
            connection.addListener("data", dataSink);
            connection.prependOnceListener("close", onClose);
            connection.addListener("error", onError);
            this.connection = connection;
        };
        this.startListening = () => {
            const { port, linkName } = this.params;
            this.server.addListener("connection", this.handleConnection);
            this.server.listen({
                host: "0.0.0.0",
                port
            }, () => {
                Barrel_1.debugTcs(`${linkName}: Listening on: ${port}`);
            });
        };
        this.stopListening = () => {
            Barrel_1.debugTcs(`${this.params.linkName}: Stop Listening`);
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
        this.server = this.net.createServer();
        if (this.params.disconnectHandler) {
            this.server.addListener("close", this.params.disconnectHandler);
        }
    }
}
exports.ServerSocket = ServerSocket;
