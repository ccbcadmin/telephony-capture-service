"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Observable_1 = require("rxjs/Observable");
const net = require("net");
const lodash_1 = __importDefault(require("lodash"));
const moment_1 = __importDefault(require("moment"));
const Barrel_1 = require("../Barrel");
class ClientSocket {
    constructor(linkName, host, port, connectHandler = undefined, disconnectHandler = undefined) {
        this.linkName = linkName;
        this.host = host;
        this.port = port;
        this.connectHandler = connectHandler;
        this.disconnectHandler = disconnectHandler;
        this.socket = new net.Socket();
        this.linkConnectSubscription = undefined;
        this.linkRetryTimer$ = Observable_1.Observable.interval(5000).timeInterval().startWith().map(() => moment_1.default());
        this.linkConnect$ = Observable_1.Observable.fromEvent(this.socket, "connect").map(() => moment_1.default());
        this.linkClose$ = Observable_1.Observable.fromEvent(this.socket, "close").map(() => moment_1.default());
        this.linkConnect = () => {
            Barrel_1.logInfo(`${this.linkName}: Connected`);
            this.linkConnectSubscription ?
                this.linkConnectSubscription.unsubscribe() :
                lodash_1.default.noop;
            this.linkConnectSubscription = undefined;
            this.linkRetrySubscription ? this.linkRetrySubscription.unsubscribe() : lodash_1.default.noop;
            this.linkRetrySubscription = undefined;
            this.linkCloseSubscription = this.linkClose$.subscribe(this.linkClosed);
            this.connectHandler ? this.connectHandler() : lodash_1.default.noop;
        };
        this.linkClosed = () => {
            this.linkCloseSubscription ? this.linkCloseSubscription.unsubscribe() : lodash_1.default.noop;
            this.linkCloseSubscription = undefined;
            this.linkRetrySubscription = this.linkRetryTimer$.subscribe(this.linkRetry);
            Barrel_1.logError(`${this.linkName}: Closed`);
            this.disconnectHandler ? this.disconnectHandler() : lodash_1.default.noop;
        };
        this.linkRetry = () => {
            Barrel_1.logError(`${this.linkName}: Retry`);
            this.socket.connect(this.port, this.host);
            this.socket.setKeepAlive(true);
            if (!this.linkConnectSubscription) {
                this.linkConnectSubscription = this.linkConnect$.subscribe(this.linkConnect);
            }
        };
        this.destroy = () => {
            Barrel_1.logError(`${this.linkName}: Disconnected`);
            this.socket.destroy();
        };
        this.write = (msg) => this.socket.write(msg);
        Observable_1.Observable.fromEvent(this.socket, "error").subscribe((error) => {
            Barrel_1.logError(`${this.linkName} Link Error:\n${JSON.stringify(error, null, 4)}`);
        });
        this.linkRetrySubscription = this.linkRetryTimer$.subscribe(this.linkRetry);
    }
}
exports.ClientSocket = ClientSocket;
exports.createClient = (linkName, host, port, connectHandler = undefined, disconnectHandler = undefined) => new Promise((resolve) => resolve(new ClientSocket(linkName, host, port, connectHandler, disconnectHandler)));
