import { networkIP } from './util';
import 'rxjs/Rx';
import { Observable } from 'rxjs/Observable';

const moment = require('moment');
const _ = require('lodash');

export class Queue {

	private amqp = require('amqplib/callback_api');
	private connection;
	private channel;
	private queueName: string;
	private messageCounter = 0;
	private consumer;
	private maxLength;
	private retryConnectTimer$ = Observable.interval(1000).take(15).startWith();
	private retryConnectSubscription;

	constructor(queueName: string, consumer = null, maxLength = null) {

		this.queueName = queueName;
		this.consumer = consumer;
		this.maxLength = maxLength;
		this.connection = null;

		this.retryConnectSubscription = this.retryConnectTimer$.subscribe(
			data => {
				this.connect();
			},
			error => {
				console.log(`${this.queueName} error: ${JSON.stringify(error)}`);
				process.exit(1);
			},
			() => {
				console.log(`${this.queueName} not available...aborting.`);
				process.exit(1);
			});
	}

	private connect = () => {

		this.amqp.connect(`amqp://localhost:5672`, (err, queueConnection) => {
			if (err) {
				return;
			}

			queueConnection.addListener('error', (err) => {
				if (err.message !== "Connection closing") {
					console.error("[AMQP] conn error", err.message);
					process.exit(1);
				}
			});

			queueConnection.addListener('close', () => { });

			this.connection = queueConnection;

			// Stop the retrys - we are connected
			this.retryConnectSubscription.unsubscribe();

			this.connection.createChannel((err, channel) => {

				if (err) {
					console.log(`Cannot create channel for ${this.queueName}: `, err);
					process.exit(1);
				}

				console.log(`Channel to Message Broker for ${this.queueName} Created`);

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
						} else {
							this.channel.nack(msg);
							// Can't consume, kill the process and wait for the restart
							process.exit(1);
						}

					}, { noAck: false });
				}
			});
		});
	}

	public sendToQueue = (msg: Buffer) => {
		// Any hiccups from RabbitMQ and the process exits
		if (!this.channel.sendToQueue(this.queueName, msg, { persistent: true })) {
			console.log(`${this.queueName} not available...aborting`);
			process.exit(1);
		}
	}

	public purge = () => {
		this.channel.purgeQueue();
	}
	public close = () => {
		console.log('Close queue connection');

		// Stop listening to queue events
		// this.connection ? this.connection.removeListener('close', () => { }) : _.noop;
		// this.connection ? this.connection.removeListener('error', () => { }) : _.noop;
	}
}
