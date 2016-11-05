"use strict";
class ClientSocket {
    constructor(linkName, host, port) {
        this.net = require('net');
        this.retryCount = 0;
        this.openSocket = () => {
            this.socket = this.net.connect(this.port, this.host);
            this.socket.setKeepAlive(true);
            this.socket.on('connect', this.onConnect.bind({}, this.socket));
            this.socket.on('error', this.onError.bind({}, this.socket));
        };
        this.onConnect = (socket) => {
            console.log(`${this.linkName}: Link open`);
            this.retryCount = 0;
            this.active = true;
        };
        this.onError = (socket) => {
            if (this.retryCount % 5 === 0) {
                console.log(`${this.linkName}: Link lost...retrying`);
            }
            ++this.retryCount;
            this.socket.destroy();
            this.socket.unref();
            setTimeout(this.openSocket, 2000);
        };
        this.write = (msg) => {
            if (this.active) {
                return this.active = this.socket.write(msg);
            }
            else {
                return false;
            }
        };
        this.linkName = linkName;
        this.host = host;
        this.port = port;
        this.active = false;
        this.openSocket();
    }
}
exports.ClientSocket = ClientSocket;
