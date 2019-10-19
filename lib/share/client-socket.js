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
    constructor(params) {
        this.params = params;
        this.socket = new net.Socket();
        this.linkConnectSubscription = undefined;
        this.linkRetryTimer$ = Observable_1.Observable.interval(5000).timeInterval().startWith().map(() => moment_1.default());
        this.linkConnect$ = Observable_1.Observable.fromEvent(this.socket, "connect").map(() => moment_1.default());
        this.linkClose$ = Observable_1.Observable.fromEvent(this.socket, "close").map(() => moment_1.default());
        this.linkConnect = () => {
            const { connectHandler, linkName } = this.params;
            Barrel_1.logInfo(`${linkName}: Connected`);
            this.linkConnectSubscription ?
                this.linkConnectSubscription.unsubscribe() :
                lodash_1.default.noop;
            this.linkConnectSubscription = undefined;
            this.linkRetrySubscription ? this.linkRetrySubscription.unsubscribe() : lodash_1.default.noop;
            this.linkRetrySubscription = undefined;
            this.linkCloseSubscription = this.linkClose$.subscribe(this.linkClosed);
            connectHandler ? connectHandler() : lodash_1.default.noop;
        };
        this.linkClosed = () => {
            const { disconnectHandler, linkName } = this.params;
            this.linkCloseSubscription ? this.linkCloseSubscription.unsubscribe() : lodash_1.default.noop;
            this.linkCloseSubscription = undefined;
            this.linkRetrySubscription = this.linkRetryTimer$.subscribe(this.linkRetry);
            Barrel_1.logError(`${linkName}: Closed`);
            disconnectHandler ? disconnectHandler() : lodash_1.default.noop;
        };
        this.linkRetry = () => {
            const { disconnectHandler, host, linkName, port } = this.params;
            Barrel_1.logError(`${linkName}: Retry`);
            this.socket.connect(port, host);
            this.socket.setKeepAlive(true);
            if (!this.linkConnectSubscription) {
                this.linkConnectSubscription = this.linkConnect$.subscribe(this.linkConnect);
            }
        };
        this.destroy = () => {
            const { linkName, } = this.params;
            Barrel_1.logError(`${linkName}: Disconnected`);
            this.socket.destroy();
        };
        this.write = (msg) => this.socket.write(msg);
        const { linkName } = params;
        Observable_1.Observable.fromEvent(this.socket, "error").subscribe((error) => {
            Barrel_1.logError(`${linkName} Link Error:\n${JSON.stringify(error, null, 4)}`);
        });
        this.linkRetrySubscription = this.linkRetryTimer$.subscribe(this.linkRetry);
    }
}
exports.ClientSocket = ClientSocket;
exports.createClient = (linkName, host, port, connectHandler = undefined, disconnectHandler = undefined) => new Promise((resolve) => resolve(new ClientSocket({
    linkName,
    host,
    port,
    connectHandler,
    disconnectHandler
})));
