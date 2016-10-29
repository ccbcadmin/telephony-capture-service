"use strict";
var Queue = (function () {
    function Queue(queueName, consumer) {
        var _this = this;
        this.amqp = require('amqplib/callback_api');
        this.messageCounter = 0;
        this.sendToQueue = function (msg) {
            if (_this.ready) {
                _this.channel.sendToQueue(_this.queueName, new Buffer(msg), { persistent: true });
            }
            else {
                console.log("Queue " + _this.queueName + " not ready - Aborting");
                process.exit(0);
            }
        };
        this.queueName = queueName;
        this.consumer = consumer;
        this.ready = false;
        this.amqp.connect('amqp://192.168.99.100:32771', function (err, queueConnection) {
            if (err) {
                console.log(err);
                process.exit(0);
            }
            queueConnection.createChannel(function (err, channel) {
                if (err) {
                    console.log("Cannot create channel for Queue " + _this.queueName + ": ", err);
                    process.exit(0);
                }
                channel.assertQueue(queueName, { durable: true });
                _this.channel = channel;
                if (_this.consumer) {
                    channel.consume(queueName, function (msg) {
                        ++_this.messageCounter;
                        _this.consumer(msg) ? channel.ack(msg) : channel.nack(msg);
                    }, { noAck: false });
                }
                _this.ready = true;
            });
        });
    }
    return Queue;
}());
exports.Queue = Queue;
