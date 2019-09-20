"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const assert_1 = __importDefault(require("assert"));
const Observable_1 = require("rxjs/Observable");
const amqplib_1 = __importDefault(require("amqplib"));
class Queue {
    constructor(queueName, consumer = undefined, disconnectHandler = undefined, connectHandler = undefined) {
        this.queueName = queueName;
        this.consumer = consumer;
        this.disconnectHandler = disconnectHandler;
        this.connectHandler = connectHandler;
        this.retryConnectTimer$ = Observable_1.Observable.timer(0, 5000).startWith();
        this.retryConnection = () => {
            this.retryConnectSubscription = this.retryConnectTimer$.subscribe(data => {
                this.connect();
            }, err => {
                console.log(`${this.queueName} Retry Error: ${JSON.stringify(err, null, 4)}`);
            });
        };
        this.closeEvent = () => {
            console.log(`${this.queueName} Close Event`);
            this.disconnectHandler ? this.disconnectHandler() : lodash_1.default.noop;
            this.connection ? this.connection.removeListener("close", this.closeEvent) : lodash_1.default.noop;
            this.connection ? this.connection.removeListener("error", this.errorEvent) : lodash_1.default.noop;
            this.retryConnection();
        };
        this.errorEvent = (err) => {
            console.log(`${this.queueName} Error Event: ${JSON.stringify(err, null, 4)}`);
        };
        this.connect = () => __awaiter(this, void 0, void 0, function* () {
            try {
                this.connection = yield amqplib_1.default.connect("ToDo");
                this.retryConnectSubscription ?
                    this.retryConnectSubscription.unsubscribe() :
                    lodash_1.default.noop;
                this.connection.addListener("error", this.errorEvent);
                this.connection.addListener("close", this.closeEvent);
                this.channel = yield this.connection.createChannel();
                yield this.channel.assertQueue(this.queueName, { durable: true });
                console.log(`${this.queueName} Channel Created`);
                this.connectHandler ? this.connectHandler() : lodash_1.default.noop;
                if (this.consumer) {
                    yield this.channel.consume(this.queueName, (msg) => __awaiter(this, void 0, void 0, function* () {
                        if (this.consumer && (yield this.consumer(msg.content))) {
                            this.channel ? this.channel.ack(msg) : lodash_1.default.noop;
                        }
                    }), { noAck: false });
                }
            }
            catch (err) {
                return Promise.reject();
            }
        });
        this.sendToQueue = (msg) => {
            assert_1.default(this.channel, "Software Anomaly");
            if (this.channel) {
                this.channel.sendToQueue(this.queueName, msg, { persistent: true });
            }
        };
        this.purge = () => __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.channel) {
                    return yield this.channel.purgeQueue(this.queueName);
                }
                else {
                    return Promise.reject(new Error("Channel Not Defined"));
                }
            }
            catch (err) {
                return Promise.reject(new Error(err.message));
            }
        });
        this.close = () => {
            if (this.channel) {
                this.channel.close();
                this.channel = undefined;
            }
            this.connection ? this.connection.removeListener("close", this.closeEvent) : lodash_1.default.noop;
            this.connection ? this.connection.removeListener("error", this.errorEvent) : lodash_1.default.noop;
            console.log(`${this.queueName} Channel Closed`);
            this.connection ? this.connection.close() : lodash_1.default.noop;
            this.connection = undefined;
        };
        this.retryConnection();
    }
}
exports.Queue = Queue;
