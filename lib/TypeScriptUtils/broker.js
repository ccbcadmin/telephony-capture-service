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
const rxjs_1 = require("rxjs");
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = require("./logger");
const debug_1 = require("./debug");
const amqplib_1 = __importDefault(require("amqplib"));
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    RABBITMQ_DEFAULT_USER: str(),
    RABBITMQ_DEFAULT_PASS: str(),
    RABBITMQ_NODE_PORT: str(),
    RABBITMQ_HOST: str(),
    RABBITMQ_EXCHANGE: str()
});
class Broker {
    constructor(brokerParams) {
        this.brokerParams = brokerParams;
        this.retryConnectTimer$ = rxjs_1.Observable.timer(0, 5000).startWith();
        this.retryConnection = () => {
            try {
                this.retryConnectSubscription = this.retryConnectTimer$.subscribe((data) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield this.connect();
                    }
                    catch (err) {
                        debug_1.debugBroker(`retryConnectSubscription() Error: ${err.message}`);
                    }
                }), (err) => {
                    debug_1.debugBroker('Broker Retry Error', err);
                });
            }
            catch (err) {
                throw err;
            }
        };
        this.closeEvent = (event) => {
            debug_1.debugBroker(`Broker Close Event: `, { event });
            this.brokerParams.disconnectHandler ? this.brokerParams.disconnectHandler() : lodash_1.default.noop;
            this.connection ? this.connection.removeListener("close", this.closeEvent) : lodash_1.default.noop;
            this.connection ? this.connection.removeListener("error", this.errorEvent) : lodash_1.default.noop;
            this.retryConnection();
        };
        this.errorEvent = (err) => {
            debug_1.debugBroker(`Broker Error Event: ${JSON.stringify(err, null, 4)}`);
        };
        this.connect = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const connectString = `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_NODE_PORT}`;
                this.connection = yield amqplib_1.default.connect(connectString);
                this.retryConnectSubscription ?
                    this.retryConnectSubscription.unsubscribe() :
                    lodash_1.default.noop;
                this.connection.addListener("error", this.errorEvent);
                this.connection.addListener("close", this.closeEvent);
                this.channel = yield this.connection.createChannel();
                this.channel.prefetch(1);
                debug_1.debugBroker('Channel Created');
                yield this.channel.assertExchange(process.env.RABBITMQ_EXCHANGE, 'topic', { durable: true });
                for (const topic of this.brokerParams.topics) {
                    const q = yield this.channel.assertQueue(topic.routingKey, { durable: false });
                    yield this.channel.bindQueue(q.queue, process.env.RABBITMQ_EXCHANGE, topic.routingKey);
                    yield this.channel.consume(q.queue, (msg) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            yield topic.dataSink(JSON.parse(msg.content.toString()));
                            this.channel ? this.channel.ack(msg) : lodash_1.default.noop;
                        }
                        catch (err) {
                            logger_1.logError(err.message, err);
                            if (this.brokerParams.dataSinkError) {
                                this.brokerParams.dataSinkError();
                            }
                        }
                    }), { noAck: false });
                }
                debug_1.debugBroker('Connect Handler Available:', Boolean(this.brokerParams.connectHandler));
                this.brokerParams.connectHandler ? this.brokerParams.connectHandler() : lodash_1.default.noop;
                debug_1.debugBroker('Connect Handler Called');
            }
            catch (err) {
                debug_1.debugBroker('Broker Error:', err.message);
                logger_1.logFatal(err.message);
                return Promise.reject(new Error(err.message));
            }
        });
        this.publish = (key, msg) => this.channel ?
            this.channel.publish(process.env.RABBITMQ_EXCHANGE, key, msg, { persistent: false }) :
            false;
        this.close = () => {
            this.channel ? this.channel.close() : lodash_1.default.noop;
            this.connection ? this.connection.removeListener("close", this.closeEvent) : lodash_1.default.noop;
            this.connection ? this.connection.removeListener("error", this.errorEvent) : lodash_1.default.noop;
            this.connection ? this.connection.close() : lodash_1.default.noop;
        };
        setTimeout(this.retryConnection, 5000);
        debug_1.debugBroker({ brokerParams });
    }
}
exports.Broker = Broker;
