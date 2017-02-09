"use strict";
require('rxjs/Rx');
const Observable_1 = require('rxjs/Observable');
const moment = require('moment');
const _ = require('lodash');
class Queue {
    constructor(queueName, maxLength, consumer, disconnectHandler) {
        this.amqp = require('amqplib/callback_api');
        this.messageCounter = 0;
        this.retryConnectTimer$ = Observable_1.Observable.interval(5000).startWith();
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
            this.connection ? this.connection.removeListener('close', this.closeEvent) : _.noop;
            this.connection ? this.connection.removeListener('error', this.errorEvent) : _.noop;
            this.retryConnection();
        };
        this.errorEvent = (err) => {
            console.log(`${this.queueName} Error Event: ${JSON.stringify(err, null, 4)}`);
        };
        this.connect = () => {
            this.amqp.connect(`amqp://localhost:5672`, (err, queueConnection) => {
                if (err) {
                    console.log(`${this.queueName} Connection Error: ${JSON.stringify(err, null, 4)}`);
                }
                else {
                    this.retryConnectSubscription.unsubscribe();
                    queueConnection.addListener('error', this.errorEvent);
                    queueConnection.addListener('close', this.closeEvent);
                    this.connection = queueConnection;
                    this.connection.createChannel((err, channel) => {
                        if (err) {
                            console.log(`${this.queueName} createChannel Error: ${JSON.stringify(err, null, 4)}`);
                            process.exit(1);
                        }
                        console.log(`${this.queueName} Channel Created`);
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
                }
            });
        };
        this.sendToQueue = (msg) => {
            if (!this.channel.sendToQueue(this.queueName, msg, { persistent: true })) {
                console.log(`${this.queueName} Unable to Send to Queue`);
                return false;
            }
            else {
                return true;
            }
        };
        this.purge = () => {
            console.log(`Queue ${this.queueName} Purged`);
            this.channel.purgeQueue();
        };
        this.close = () => {
            this.connection ? this.connection.removeListener('close', this.closeEvent) : _.noop;
            this.connection ? this.connection.removeListener('error', this.errorEvent) : _.noop;
            console.log(`${this.queueName} Channel Closed`);
            this.connection.close();
        };
        this.queueName = queueName;
        this.consumer = consumer;
        this.maxLength = maxLength;
        this.disconnectHandler = disconnectHandler;
        this.connection = null;
        this.retryConnection();
    }
}
exports.Queue = Queue;
