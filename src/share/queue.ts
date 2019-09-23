// tslint:disable: indent

import moment from "moment";
import _ from "lodash";
import assert from "assert";
import { Observable } from "rxjs/Observable";
import amqp, { Message } from "amqplib";
import { Subscription } from "rxjs";
import { logError, debugTcs, setTimeoutPromise } from "../Barrel";

export class Queue {

	private connection: amqp.Connection | undefined;
	private channel: amqp.Channel | undefined;
	private retryConnectTimer$ = Observable.timer(0, 5000).startWith();
	private retryConnectSubscription: Subscription | undefined;

	constructor(private queueParams: {
		queueName: string;
		consumer?: ((Buffer: Message) => Promise<boolean>);
		disconnectHandler?: (() => void);
		connectHandler?: (() => void);
	}) {
		try {
			setImmediate(this.retryConnection);
		} catch (err) {
			debugTcs(err.message);
		}
	}

	private retryConnection = async () => {

		const { queueName } = this.queueParams;

		try {

			this.retryConnectSubscription = this.retryConnectTimer$.subscribe(

				async (): Promise<void> => {

					try {
						await this.connect();

					} catch (err) {
						const log = `retryConnection failed: ${err.message}`;
						logError(log);
					}
				},
				err => {
					const msg = `${queueName} Retry Error: ${err.message}}`;
					debugTcs(msg);
					logError(msg);
				});

		} catch (err) {
			const msg = `${queueName} Retry Error: ${err.message}}`;
			logError(msg);
		}
	}

	private closeEvent = async () => {

		const {
			queueName,
			disconnectHandler,
		} = this.queueParams;

		logError(`${queueName} Close Event`);

		// Inform the client
		disconnectHandler ? disconnectHandler() : _.noop;

		// Stop listening to queue events
		this.connection ? this.connection.removeListener("close", this.closeEvent) : _.noop;
		this.connection ? this.connection.removeListener("error", this.errorEvent) : _.noop;

		await this.retryConnection();
	}

	private errorEvent = (err: any) => {

		const { queueName } = this.queueParams;

		// Take note of the error - no further action required
		logError(`${queueName} Error Event: ${JSON.stringify(err, null, 4)}`);
	}

	private connect = async (): Promise<void> => {

		try {

			const {
				queueName,
				connectHandler,
				consumer,
			} = this.queueParams;

			this.connection = await amqp.connect("amqp://localhost");

			// Stop retrying
			this.retryConnectSubscription ?
				this.retryConnectSubscription.unsubscribe() :
				_.noop;

			this.connection.addListener("error", this.errorEvent);
			this.connection.addListener("close", this.closeEvent);

			this.channel = await this.connection.createChannel();

			await this.channel.assertQueue(queueName, { durable: true });

			logError(`${queueName} Channel Created`);

			this.channel.prefetch(1);

			// Inform the client that a channel exists
			connectHandler ? connectHandler() : _.noop;

			if (consumer) {

				// The client expects messages
				await this.channel.consume(queueName, async (msg: Message) => {

					try {

						await consumer(msg);
						this.channel ? this.channel.ack(msg) : _.noop;

					} catch (err) {
						// If the client is not able to handle the message at this time,
						// then no Ack is returned to the queuing service, meaning that it
						// will retry later.
						const log = `Failed to Consume Queue Message, Error: ${err.message}`;
						logError(log);
						debugTcs(log);
						// But do not throw;
					}
				}, { noAck: false });
			}
		} catch (err) {
			return Promise.reject(err);
		}
	}

	public sendToQueue = (msg: Buffer) => {

		assert(this.channel, "Software Anomaly");

		const { queueName } = this.queueParams;


		if (this.channel) {

			debugTcs("sendToQueue()");
			this.channel.sendToQueue(queueName, msg, { persistent: true });
		}
	}

	// 'purge' facilitates testing; it is not for Production use.
	public purge = async (): Promise<any> => {

		try {

			const { queueName } = this.queueParams;

			if (this.channel) {
				return await this.channel.purgeQueue(queueName);
			} else {
				return Promise.reject(new Error("Channel Not Defined"));
			}
		} catch (err) {
			return Promise.reject(new Error(err.message));
		}
	}

	public close = async () => {

		// Stop listening to queue events

		const { queueName } = this.queueParams;

		if (this.channel) {
			await this.channel.close();
			this.channel = undefined;
		}
		this.connection ? this.connection.removeListener("close", this.closeEvent) : _.noop;
		this.connection ? this.connection.removeListener("error", this.errorEvent) : _.noop;

		logError(`${queueName} Channel Closed`);
		this.connection ? await this.connection.close() : _.noop;
		this.connection = undefined;
	}
}
