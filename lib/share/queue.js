"use strict";
require('rxjs/Rx');
const Observable_1 = require('rxjs/Observable');
const moment = require('moment');
class Queue {
    constructor(queueName, consumer = null) {
        this.amqp = require('amqplib/callback_api');
        this.messageCounter = 0;
        this.retryConnectTimer$ = Observable_1.Observable.interval(1000).take(15).startWith();
        this.connect = () => {
            this.amqp.connect(`amqp://${process.env.DOCKER_MACHINE_IP}:5672`, (err, queueConnection) => {
                if (err) {
                    return;
                }
                this.connection = queueConnection;
                this.retryConnectSubscription.unsubscribe();
                this.connection.createChannel((err, channel) => {
                    if (err) {
                        console.log(`Cannot create channel for ${this.queueName}: `, err);
                        process.exit(0);
                    }
                    console.log(`Channel to Message Broker for ${this.queueName} Created`);
                    channel.assertQueue(this.queueName, { durable: true });
                    this.channel = channel;
                    if (this.consumer) {
                        channel.consume(this.queueName, msg => {
                            this.consumer(msg) ? this.channel.ack(msg) : this.channel.nack(msg);
                        }, { noAck: false });
                    }
                });
            });
        };
        this.sendToQueue = (msg) => {
            if (!this.channel.sendToQueue(this.queueName, Buffer.from(msg), { persistent: true })) {
                console.log(`${this.queueName} not available...aborting`);
                process.exit(-1);
            }
        };
        this.close = () => {
            console.log('Close queue connection');
            this.connection.close();
        };
        this.queueName = queueName;
        this.consumer = consumer;
        this.connection = null;
        this.retryConnectSubscription = this.retryConnectTimer$.subscribe(data => {
            this.connect();
        }, error => {
            console.log(`${this.queueName} error: ${JSON.stringify(error)}`);
        }, () => {
            console.log(`${this.queueName} not available...aborting.`);
        });
    }
}
exports.Queue = Queue;
