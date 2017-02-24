import { networkIP } from "./util";
import "rxjs/Rx";
import { Observable } from "rxjs/Observable";

const moment = require("moment");
const _ = require("lodash");

export class Queue {

	private amqp = require("amqplib/callback_api");
	private connection;
	private channel;
	private queueName: string;
	private messageCounter = 0;
	private consumer;
	private maxLength;
	private retryConnectTimer$ = Observable.timer(0, 5000).startWith();
	private retryConnectSubscription;

	// Use disconnectHandler to inform the client that the channel to the queuing server is unavailable
	private disconnectHandler = null;

	// Use connectHandler to inform the client that the channel to the queuing server is available
	private connectHandler = null;

	constructor(queueName: string, maxLength: number, consumer, disconnectHandler, connectHandler = null) {

		this.queueName = queueName;
		this.consumer = consumer;
		this.maxLength = maxLength;
		this.disconnectHandler = disconnectHandler;
		this.connectHandler = connectHandler;
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
		this.connection ? this.connection.removeListener("close", this.closeEvent) : _.noop;
		this.connection ? this.connection.removeListener("error", this.errorEvent) : _.noop;

		this.retryConnection();
	}

	private errorEvent = (err) => {

		// Take note of the error - no further action required
		console.log(`${this.queueName} Error Event: ${JSON.stringify(err, null, 4)}`);
	}

	private connect = () => {

		this.amqp.connect((err, queueConnection) => {

			// Errors can safely be ignored
			if (!err) {

				// Stop retrying
				this.retryConnectSubscription.unsubscribe();

				queueConnection.addListener("error", this.errorEvent);
				queueConnection.addListener("close", this.closeEvent);

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

					// Inform the client that a channel exists
					this.connectHandler ? this.connectHandler() : _.noop;

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

		if (this.channel && this.channel.sendToQueue(this.queueName, msg, { persistent: true })) {
			return true;
		}
		else {
			// No channel to send the data to
			console.log(`${this.queueName} Unable to Send to Queue`);
			return false;
		}
	}

	// The following routine facilitates testing; it is not for use in Production.
	public purge = () => this.channel.purgeQueue();

	public close = () => {

		// Stop listening to queue events
		if (this.channel) {
			this.channel.close();
			this.channel = null;
		}
		this.connection ? this.connection.removeListener("close", this.closeEvent) : _.noop;
		this.connection ? this.connection.removeListener("error", this.errorEvent) : _.noop;

		console.log(`${this.queueName} Channel Closed`);
		this.connection.close();
		this.connection = null;
	}
}
