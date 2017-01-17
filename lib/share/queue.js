"use strict";
require("rxjs/Rx");
const Observable_1 = require("rxjs/Observable");
const moment = require('moment');
const _ = require('lodash');
class Queue {
    constructor(queueName, consumer = null) {
        this.amqp = require('amqplib/callback_api');
        this.messageCounter = 0;
        this.retryConnectTimer$ = Observable_1.Observable.interval(1000).take(15).startWith();
        this.connect = () => {
            this.amqp.connect(`amqp://localhost:5672`, (err, queueConnection) => {
                if (err) {
                    return;
                }
                queueConnection.on("error", (err) => {
                    if (err.message !== "Connection closing") {
                        console.error("[AMQP] conn error", err.message);
                        process.exit(1);
                    }
                });
                queueConnection.on("close", () => {
                    console.error("[AMQP] reconnecting");
                    process.exit(1);
                });
                this.connection = queueConnection;
                this.retryConnectSubscription.unsubscribe();
                this.connection.createChannel((err, channel) => {
                    if (err) {
                        console.log(`Cannot create channel for ${this.queueName}: `, err);
                        process.exit(1);
                    }
                    console.log(`Channel to Message Broker for ${this.queueName} Created`);
                    channel.assertQueue(this.queueName, { durable: true });
                    this.channel = channel;
                    if (this.consumer) {
                        channel.consume(this.queueName, (msg) => {
                            if (this.consumer(msg.content)) {
                                this.channel.ack(msg);
                            }
                            else {
                                this.channel.nack(msg);
                                process.exit(1);
                            }
                        }, { noAck: false });
                    }
                });
            });
        };
        this.sendToQueue = (msg) => {
            if (!this.channel.sendToQueue(this.queueName, msg, { persistent: true })) {
                console.log(`${this.queueName} not available...aborting`);
                process.exit(1);
            }
        };
        this.close = () => {
            console.log('Close queue connection');
            this.connection ? this.connection.close() : _.noop;
        };
        this.queueName = queueName;
        this.consumer = consumer;
        this.connection = null;
        this.retryConnectSubscription = this.retryConnectTimer$.subscribe(data => {
            this.connect();
        }, error => {
            console.log(`${this.queueName} error: ${JSON.stringify(error)}`);
            process.exit(1);
        }, () => {
            console.log(`${this.queueName} not available...aborting.`);
            process.exit(1);
        });
    }
}
exports.Queue = Queue;
