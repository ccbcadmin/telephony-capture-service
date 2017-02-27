"use strict";
require("rxjs/Rx");
const Observable_1 = require("rxjs/Observable");
const moment = require("moment");
const _ = require("lodash");
class Queue {
    constructor(queueName, consumer = null, disconnectHandler = null, connectHandler = null) {
        this.amqp = require("amqplib/callback_api");
        this.messageCounter = 0;
        this.retryConnectTimer$ = Observable_1.Observable.timer(0, 5000).startWith();
        this.disconnectHandler = null;
        this.connectHandler = null;
        this.retryConnection = () => {
            this.retryConnectSubscription = this.retryConnectTimer$.subscribe(data => {
                this.connect();
            }, err => {
                console.log(`${this.queueName} Retry Error: ${JSON.stringify(err, null, 4)}`);
            });
        };
        this.closeEvent = () => {
            console.log(`${this.queueName} Close Event`);
            this.disconnectHandler ? this.disconnectHandler() : _.noop;
            this.connection ? this.connection.removeListener("close", this.closeEvent) : _.noop;
            this.connection ? this.connection.removeListener("error", this.errorEvent) : _.noop;
            this.retryConnection();
        };
        this.errorEvent = (err) => {
            console.log(`${this.queueName} Error Event: ${JSON.stringify(err, null, 4)}`);
        };
        this.consume = (msg) => {
            if (this.consumer(msg.content)) {
                this.channel.ack(msg);
            }
        };
        this.connect = () => this.amqp.connect()
            .then((queueConnection) => {
            this.retryConnectSubscription.unsubscribe();
            queueConnection.addListener("error", this.errorEvent);
            queueConnection.addListener("close", this.closeEvent);
            this.connection = queueConnection;
            this.connection.createChannel()
                .then((channel) => {
                console.log(`${this.queueName} Channel Created`);
                channel.assertQueue(this.queueName, { durable: true });
                this.channel = channel;
                this.connectHandler ? this.connectHandler() : _.noop;
                this.consumer ? this.channel.consume(this.queueName, this.consume, { noAck: false }) : _.noop;
            });
        });
        this.sendToQueue = (msg) => this.channel.sendToQueue(this.queueName, msg, { persistent: true });
        this.purge = () => this.channel.purgeQueue();
        this.close = () => {
            if (this.channel) {
                this.channel.close();
                this.channel = null;
            }
            this.connection ? this.connection.removeListener("close", this.closeEvent) : _.noop;
            this.connection ? this.connection.removeListener("error", this.errorEvent) : _.noop;
            console.log(`${this.queueName} Channel Closed`);
            this.connection.close();
            this.connection = null;
        };
        this.queueName = queueName;
        this.consumer = consumer;
        this.disconnectHandler = disconnectHandler;
        this.connectHandler = connectHandler;
        this.connection = null;
        this.retryConnection();
    }
}
exports.Queue = Queue;
