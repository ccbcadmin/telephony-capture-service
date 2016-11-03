"use strict";
class Queue {
    constructor(queueName, consumer) {
        this.amqp = require('amqplib/callback_api');
        this.messageCounter = 0;
        this.sendToQueue = (msg) => {
            if (this.ready) {
                this.channel.sendToQueue(this.queueName, new Buffer(msg), { persistent: true });
            }
            else {
                console.log(`Queue ${this.queueName} not ready - Aborting`);
                process.exit(0);
            }
        };
        this.queueName = queueName;
        this.consumer = consumer;
        this.ready = false;
        this.amqp.connect('amqp://192.168.99.100:32771', (err, queueConnection) => {
            if (err) {
                console.log(err);
                process.exit(0);
            }
            queueConnection.createChannel((err, channel) => {
                if (err) {
                    console.log(`Cannot create channel for Queue ${this.queueName}: `, err);
                    process.exit(0);
                }
                channel.assertQueue(queueName, { durable: true });
                this.channel = channel;
                if (this.consumer) {
                    channel.consume(queueName, msg => {
                        ++this.messageCounter;
                        this.consumer(msg) ? channel.ack(msg) : channel.nack(msg);
                    }, { noAck: false });
                }
                this.ready = true;
            });
        });
    }
}
exports.Queue = Queue;
