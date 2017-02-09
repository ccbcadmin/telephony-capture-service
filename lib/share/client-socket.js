"use strict";
const _ = require('lodash');
class ClientSocket {
    constructor(linkName, host, port, connectHandler = null) {
        this.net = require('net');
        this.retryCount = 0;
        this.openSocket = () => {
            this.socket = this.net.createConnection({ port: this.port }, this.onConnect);
            this.socket.on('end', () => { console.log('disconnected from server'); });
            this.socket.on('close', () => { console.log('link closed'); });
        };
        this.onConnect = () => {
            console.log(`${this.linkName}: Connected`);
            this.retryCount = 0;
            this.active = true;
            this.connectHandler ? this.connectHandler() : _.noop;
        };
        this.onClose = socket => {
            setTimeout(this.openSocket, 2000);
        };
        this.write = (msg) => {
            if (this.active) {
                if (this.socket.write(msg), 'binary') {
                    return true;
                }
            }
            return false;
        };
        this.destroy = () => {
            this.active ? this.socket.destroy() : _.noop;
        };
        this.linkName = linkName;
        this.host = host;
        this.port = port;
        this.active = false;
        this.connectHandler = connectHandler;
        this.openSocket();
    }
}
exports.ClientSocket = ClientSocket;
