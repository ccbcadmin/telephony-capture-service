"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("rxjs/Rx");
const Observable_1 = require("rxjs/Observable");
const net = require("net");
const _ = require("lodash");
const moment = require("moment");
class ClientSocket {
    constructor(linkName, host, port, connectHandler = undefined, disconnectHandler = undefined) {
        this.linkName = linkName;
        this.host = host;
        this.port = port;
        this.connectHandler = connectHandler;
        this.disconnectHandler = disconnectHandler;
        this.socket = new net.Socket();
        this.linkConnectSubscription = undefined;
        this.linkRetryTimer$ = Observable_1.Observable.interval(5000).timeInterval().startWith().map(() => moment());
        this.linkConnect$ = Observable_1.Observable.fromEvent(this.socket, "connect").map(() => moment());
        this.linkClose$ = Observable_1.Observable.fromEvent(this.socket, "close").map(() => moment());
        this.linkConnect = () => {
            console.log(`${this.linkName}: Connected`);
            this.linkConnectSubscription ?
                this.linkConnectSubscription.unsubscribe() :
                _.noop;
            this.linkConnectSubscription = undefined;
            this.linkRetrySubscription ? this.linkRetrySubscription.unsubscribe() : _.noop;
            this.linkRetrySubscription = undefined;
            this.linkCloseSubscription = this.linkClose$.subscribe(this.linkClosed);
            this.connectHandler ? this.connectHandler() : _.noop;
        };
        this.linkClosed = () => {
            this.linkCloseSubscription ? this.linkCloseSubscription.unsubscribe() : _.noop;
            this.linkCloseSubscription = undefined;
            this.linkRetrySubscription = this.linkRetryTimer$.subscribe(this.linkRetry);
            console.log(`${this.linkName}: Closed`);
            this.disconnectHandler ? this.disconnectHandler() : _.noop;
        };
        this.linkRetry = () => {
            console.log(`${this.linkName}: Retry`);
            this.socket.connect(this.port, this.host);
            this.socket.setKeepAlive(true);
            if (!this.linkConnectSubscription) {
                this.linkConnectSubscription = this.linkConnect$.subscribe(this.linkConnect);
            }
        };
        this.destroy = () => {
            console.log(`${this.linkName}: Disconnected`);
            this.socket.destroy();
        };
        this.write = (msg) => this.socket.write(msg);
        Observable_1.Observable.fromEvent(this.socket, "error").subscribe((error) => {
            console.log(`${this.linkName} Link Error:\n${JSON.stringify(error, null, 4)}`);
        });
        this.linkRetrySubscription = this.linkRetryTimer$.subscribe(this.linkRetry);
    }
}
exports.ClientSocket = ClientSocket;
exports.createClient = (linkName, host, port, connectHandler = undefined, disconnectHandler = undefined) => new Promise((resolve) => resolve(new ClientSocket(linkName, host, port, connectHandler, disconnectHandler)));
