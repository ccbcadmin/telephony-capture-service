"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
const Barrel_1 = require("../Barrel");
class Queue {
    constructor(queueParams) {
        this.queueParams = queueParams;
        this.retryConnectTimer$ = Observable_1.Observable.timer(0, 5000).startWith();
        this.retryConnection = () => __awaiter(this, void 0, void 0, function* () {
            const { queueName } = this.queueParams;
            try {
                this.retryConnectSubscription = this.retryConnectTimer$.subscribe(() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield this.connect();
                    }
                    catch (err) {
                        const log = `retryConnection failed: ${err.message}`;
                        Barrel_1.logError(log);
                    }
                }), err => {
                    const msg = `${queueName} Retry Error: ${err.message}}`;
                    Barrel_1.debugTcs(msg);
                    Barrel_1.logError(msg);
                });
            }
            catch (err) {
                const msg = `${queueName} Retry Error: ${err.message}}`;
                Barrel_1.logError(msg);
            }
        });
        this.closeEvent = () => __awaiter(this, void 0, void 0, function* () {
            const { queueName, disconnectHandler, } = this.queueParams;
            Barrel_1.logError(`${queueName} Close Event`);
            disconnectHandler ? disconnectHandler() : lodash_1.default.noop;
            this.connection ? this.connection.removeListener("close", this.closeEvent) : lodash_1.default.noop;
            this.connection ? this.connection.removeListener("error", this.errorEvent) : lodash_1.default.noop;
            yield this.retryConnection();
        });
        this.errorEvent = (err) => {
            const { queueName } = this.queueParams;
            Barrel_1.logError(`${queueName} Error Event: ${JSON.stringify(err, null, 4)}`);
        };
        this.connect = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const { queueName, connectHandler, consumer, } = this.queueParams;
                this.connection = yield amqplib_1.default.connect("amqp://localhost");
                this.retryConnectSubscription ?
                    this.retryConnectSubscription.unsubscribe() :
                    lodash_1.default.noop;
                this.connection.addListener("error", this.errorEvent);
                this.connection.addListener("close", this.closeEvent);
                this.channel = yield this.connection.createChannel();
                yield this.channel.assertQueue(queueName, { durable: true });
                Barrel_1.logError(`${queueName} Channel Created`);
                connectHandler ? connectHandler() : lodash_1.default.noop;
                if (consumer) {
                    yield this.channel.consume(queueName, (msg) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            if (consumer && (yield consumer(msg.content))) {
                                this.channel ? this.channel.ack(msg) : lodash_1.default.noop;
                            }
                        }
                        catch (err) {
                            const log = `Failed to Consume Queue Message, Error: ${err.message}`;
                            Barrel_1.logError(log);
                            Barrel_1.debugTcs(log);
                        }
                    }), { noAck: false });
                }
            }
            catch (err) {
                return Promise.reject(err);
            }
        });
        this.sendToQueue = (msg) => {
            assert_1.default(this.channel, "Software Anomaly");
            const { queueName } = this.queueParams;
            if (this.channel) {
                Barrel_1.debugTcs("sendToQueue()");
                this.channel.sendToQueue(queueName, msg, { persistent: true });
            }
        };
        this.purge = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const { queueName } = this.queueParams;
                if (this.channel) {
                    return yield this.channel.purgeQueue(queueName);
                }
                else {
                    return Promise.reject(new Error("Channel Not Defined"));
                }
            }
            catch (err) {
                return Promise.reject(new Error(err.message));
            }
        });
        this.close = () => __awaiter(this, void 0, void 0, function* () {
            const { queueName } = this.queueParams;
            if (this.channel) {
                yield this.channel.close();
                this.channel = undefined;
            }
            this.connection ? this.connection.removeListener("close", this.closeEvent) : lodash_1.default.noop;
            this.connection ? this.connection.removeListener("error", this.errorEvent) : lodash_1.default.noop;
            Barrel_1.logError(`${queueName} Channel Closed`);
            this.connection ? yield this.connection.close() : lodash_1.default.noop;
            this.connection = undefined;
        });
        try {
            setImmediate(this.retryConnection);
        }
        catch (err) {
            Barrel_1.debugTcs(err.message);
        }
    }
}
exports.Queue = Queue;
