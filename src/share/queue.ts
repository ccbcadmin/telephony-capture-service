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

		this.retryConnection();
	}

	private retryConnection = () => {
		this.retryConnectSubscription = this.retryConnectTimer$.subscribe(
			data => {
				this.connect();
			},
			err => {
				console.log(`${this.queueName} Retry Error: ${JSON.stringify(err, null, 4)}`);
				process.exit(1);
			},
			() => {
				console.log(`${this.queueName} Not Available...Aborting.`);
				process.exit(1);
			});
	}

	private closeEvent = () => {

		console.log(`${this.queueName} Channel Closed - 2`);
		this.retryConnection();
	}

	private errorEvent = (err) => {

		// Just take note of the error - no action required
		console.error("Queue error", JSON.stringify(err, null, 4));
	}

	private connect = () => {

		this.amqp.connect(`amqp://localhost:5672`, (err, queueConnection) => {

			if (err) {
				console.log(`${this.queueName} Error: ${JSON.stringify(err, null, 4)}`);

				// Inform the queue client
				if (this.disconnectHandler) {
					this.disconnectHandler();
				} else {
					throw new Error(err);
				}
			}

			// Stop retrying - we are connected
			this.retryConnectSubscription.unsubscribe();

			queueConnection.addListener('error', this.errorEvent);
			queueConnection.addListener('close', this.closeEvent);

			this.connection = queueConnection;

			this.connection.createChannel((err, channel) => {

				if (err) {
					console.log(`Cannot create channel for ${this.queueName}: `, err);
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
					// The client wants to listen to incoming data
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

		// The client not longer needs access to this queue

		// Stop listening to queue events
		this.connection ? this.connection.removeListener('close', this.closeEvent) : _.noop;
		this.connection ? this.connection.removeListener('error', this.errorEvent) : _.noop;

		console.log(`${this.queueName} Channel Closed`);
		this.connection.close();

	}
}
