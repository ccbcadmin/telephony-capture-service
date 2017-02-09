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
	private retryConnectTimer$ = Observable.interval(5000).startWith();
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
			});
	}

	private closeEvent = () => {

		console.log(`${this.queueName} Close Event`);

		// Inform the client
		this.disconnectHandler ? this.disconnectHandler() : _.noop;

		// Stop listening to queue events
		this.connection ? this.connection.removeListener('close', this.closeEvent) : _.noop;
		this.connection ? this.connection.removeListener('error', this.errorEvent) : _.noop;

		this.retryConnection();
	}

	private errorEvent = (err) => {

		// Just take note of the error - no further action taken
		console.log(`${this.queueName} Error Event: ${JSON.stringify(err, null, 4)}`);
	}

	private connect = () => {

		this.amqp.connect(`amqp://localhost:5672`, (err, queueConnection) => {

			// Errors can safely be ignored
			if (!err) {

				// Stop retrying
				this.retryConnectSubscription.unsubscribe();

				queueConnection.addListener('error', this.errorEvent);
				queueConnection.addListener('close', this.closeEvent);

				this.connection = queueConnection;

				this.connection.createChannel((err, channel) => {

					if (err) {
						console.log(`${this.queueName} createChannel Error: ${JSON.stringify(err, null, 4)}`);

						// This is a very strange error in this context, hence best to give up altogether
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

								// If the client is not able to handle the message at this time,
								// then no Ack is returned to the queuing service, meaning that it 
								// will retry later.
							}
						}, { noAck: false });
					}
				});
			}
		});
	}

	public sendToQueue = (msg: Buffer): boolean => {

		if (!this.channel.sendToQueue(this.queueName, msg, { persistent: true })) {
			console.log(`${this.queueName} Unable to Send to Queue`);
			return false;
		}
		else {
			return true;
		}
	}

	// The following routine is only required for testing purposes.  It is
	// not ever called in the Production environment.
	public purge = () => {
		console.log(`Queue ${this.queueName} Purged`);
		this.channel.purgeQueue();
	}

	public close = () => {

		// The client no longer needs/wants access to this queue

		// Stop listening to queue events
		this.connection ? this.connection.removeListener('close', this.closeEvent) : _.noop;
		this.connection ? this.connection.removeListener('error', this.errorEvent) : _.noop;

		console.log(`${this.queueName} Channel Closed`);
		this.connection.close();
	}
}
