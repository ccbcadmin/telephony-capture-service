// tslint:disable: indent

import moment from "moment";
import _ from "lodash";
import assert from "assert";
import { Observable } from "rxjs/Observable";
import amqp from "amqplib";
import { Subscription } from "rxjs";
import { logError } from "../Barrel";

export class Queue {

	private connection: amqp.Connection | undefined;
	private channel: amqp.Channel | undefined;
	private retryConnectTimer$ = Observable.timer(0, 5000).startWith();
	private retryConnectSubscription: Subscription | undefined;

	constructor(
		private queueName: string,
		private consumer: ((Buffer: Buffer) => Promise<boolean>) | undefined = undefined,
		private disconnectHandler: (() => void) | undefined = undefined,
		private connectHandler: (() => void) | undefined = undefined) {

		this.retryConnection();
	}

	private retryConnection = () => {
		this.retryConnectSubscription = this.retryConnectTimer$.subscribe(
			data => {
				this.connect();
			},
			err => {
				logError(`${this.queueName} Retry Error: ${JSON.stringify(err, null, 4)}`);
			});
	}

	private closeEvent = () => {

		logError(`${this.queueName} Close Event`);

		// Inform the client
		this.disconnectHandler ? this.disconnectHandler() : _.noop;

		// Stop listening to queue events
		this.connection ? this.connection.removeListener("close", this.closeEvent) : _.noop;
		this.connection ? this.connection.removeListener("error", this.errorEvent) : _.noop;

		this.retryConnection();
	}

	private errorEvent = (err: any) => {

		// Take note of the error - no further action required
		logError(`${this.queueName} Error Event: ${JSON.stringify(err, null, 4)}`);
	}

	private connect = async (): Promise<void> => {

		try {

			this.connection = await amqp.connect("ToDo");

			// Stop retrying
			this.retryConnectSubscription ?
				this.retryConnectSubscription.unsubscribe() :
				_.noop;

			this.connection.addListener("error", this.errorEvent);
			this.connection.addListener("close", this.closeEvent);

			this.channel = await this.connection.createChannel();

			await this.channel.assertQueue(this.queueName, { durable: true });

			logError(`${this.queueName} Channel Created`);

			// Inform the client that a channel exists
			this.connectHandler ? this.connectHandler() : _.noop;

			if (this.consumer) {

				// The client wants to listen to incoming data
				await this.channel.consume(this.queueName, async (msg: any) => {

					if (this.consumer && await this.consumer(msg.content)) {

						this.channel ? this.channel.ack(msg) : _.noop;

						// If the client is not able to handle the message at this time,
						// then no Ack is returned to the queuing service, meaning that it
						// will retry later.
					}
				}, { noAck: false });
			}
		} catch (err) {
			return Promise.reject();
		}
	}

	public sendToQueue = (msg: Buffer) => {

		assert(this.channel, "Software Anomaly");

		if (this.channel) {
			this.channel.sendToQueue(this.queueName, msg, { persistent: true });
		}
	}

	// 'purge' facilitates testing; it is not for Production use.
	public purge = async (): Promise<any> => {

		try {
			if (this.channel) {
				return await this.channel.purgeQueue(this.queueName);
			} else {
				return Promise.reject(new Error("Channel Not Defined"));
			}
		} catch (err) {
			return Promise.reject(new Error(err.message));
		}
	}

	public close = () => {

		// Stop listening to queue events
		if (this.channel) {
			this.channel.close();
			this.channel = undefined;
		}
		this.connection ? this.connection.removeListener("close", this.closeEvent) : _.noop;
		this.connection ? this.connection.removeListener("error", this.errorEvent) : _.noop;

		logError(`${this.queueName} Channel Closed`);
		this.connection ? this.connection.close() : _.noop;
		this.connection = undefined;
	}
}
