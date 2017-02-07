"use strict";
require('rxjs/Rx');
const Observable_1 = require('rxjs/Observable');
const moment = require('moment');
const _ = require('lodash');
class Queue {
    constructor(queueName, maxLength, consumer, disconnectHandler) {
        this.amqp = require('amqplib/callback_api');
        this.messageCounter = 0;
        this.retryConnectTimer$ = Observable_1.Observable.interval(1000).take(15).startWith();
        this.connect = () => {
            this.amqp.connect(`amqp://localhost:5672`, (err, queueConnection) => {
                if (err) {
                    console.log('Queue error: ', JSON.stringify(err, null, 4));
                    if (this.disconnectHandler) {
                        console.log('Here 1');
                        this.disconnectHandler();
                    }
                    else {
                        console.log('Here 2');
                        throw new Error(err);
                    }
                }
                this.retryConnectSubscription.unsubscribe();
                queueConnection.addListener('error', (err) => {
                    if (err.message !== "Connection closing") {
                        console.error("[AMQP] connection error", err.message);
                        process.exit(1);
                    }
                });
                queueConnection.addListener('close', () => { console.log('QUEUE CLOSE EVENT'); });
                this.connection = queueConnection;
                this.connection.createChannel((err, channel) => {
                    if (err) {
                        console.log(`Cannot create channel for ${this.queueName}: `, err);
                        process.exit(1);
                    }
                    console.log(`Channel to ${this.queueName} Created`);
                    if (this.maxLength) {
                        channel.assertQueue(this.queueName, { durable: true, maxLength: this.maxLength });
                    }
                    else {
                        channel.assertQueue(this.queueName, { durable: true });
                    }
                    this.channel = channel;
                    if (this.consumer) {
                        channel.consume(this.queueName, (msg) => {
                            if (this.consumer(msg.content)) {
                                this.channel.ack(msg);
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
        this.purge = () => {
            console.log(`Queue ${this.queueName} Purged`);
            this.channel.purgeQueue();
        };
        this.close = () => {
            console.log('Close queue connection');
            this.connection.close();
        };
        this.queueName = queueName;
        this.consumer = consumer;
        this.maxLength = maxLength;
        this.disconnectHandler = disconnectHandler;
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
