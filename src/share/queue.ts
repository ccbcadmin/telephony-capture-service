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
	private disconnectHandler;

	constructor(queueName: string, maxLength: number, consumer, disconnectHandler) {

		this.queueName = queueName;
		this.consumer = consumer;
		this.maxLength = maxLength;
		this.disconnectHandler = disconnectHandler;
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
				console.log('Queue error: ', JSON.stringify(err, null, 4));

				// Inform the queue client
				if (this.disconnectHandler) {
					console.log ('Here 1');
					this.disconnectHandler();
				} else {
					console.log ('Here 2');
					throw new Error(err);
				}
			}

			// Stop the retrys - we are connected
			this.retryConnectSubscription.unsubscribe();

			queueConnection.addListener('error', (err) => {
				if (err.message !== "Connection closing") {
					console.error("[AMQP] connection error", err.message);
					process.exit(1);
				}
			});

			queueConnection.addListener('close', () => { console.log ('QUEUE CLOSE EVENT') });

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
	}

	public sendToQueue = (msg: Buffer) => {
		// Any hiccups from RabbitMQ and the process exits
		if (!this.channel.sendToQueue(this.queueName, msg, { persistent: true })) {
			console.log(`${this.queueName} not available...aborting`);
			process.exit(1);
		}
	}

	public purge = () => {
		console.log(`Queue ${this.queueName} Purged`);
		this.channel.purgeQueue();
	}

	public close = () => {
		console.log('Close queue connection');
		this.connection.close();
		// Stop listening to queue events
		// this.connection ? this.connection.removeListener('close', () => { }) : _.noop;
		// this.connection ? this.connection.removeListener('error', () => { }) : _.noop;
	}
}
