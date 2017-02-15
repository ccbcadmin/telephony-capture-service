"use strict";
const _ = require("lodash");
class ClientSocket {
    constructor(linkName, host, port, connectHandler = null) {
        this.net = require("net");
        this.openSocket = () => {
            this.socket = this.net.createConnection({ host: this.host, port: this.port }, this.onConnect);
            this.socket.addListener("end", () => { console.log(`${this.linkName} Disconnected`); });
            this.socket.addListener("close", () => { console.log(`${this.linkName} Closed`); });
            this.socket.addListener("error", (error) => {
                console.log(`${this.linkName} Link Error:\n${JSON.stringify(error, null, 4)}`);
            });
        };
        this.onConnect = () => {
            console.log(`${this.linkName}: Connected`);
            this.active = true;
            this.connectHandler ? this.connectHandler() : _.noop;
        };
        this.onClose = socket => {
            setTimeout(this.openSocket, 2000);
        };
        this.write = (msg) => {
            if (this.active) {
                if (this.socket.write(msg)) {
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
