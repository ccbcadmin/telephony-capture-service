
import { networkIP } from './utility';
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
	private retryConnectTimer$ = Observable.interval(1000).take(15).startWith();
	private retryConnectSubscription;

	constructor(queueName: string, consumer = null) {

		this.queueName = queueName;
		this.consumer = consumer;
		this.connection = null;

		this.retryConnectSubscription = this.retryConnectTimer$.subscribe(
			data => {
				this.connect();
			},
			error => {
				console.log(`${this.queueName} error: ${JSON.stringify(error)}`);
			},
			() => {
				console.log(`${this.queueName} not available...aborting.`);
			});
	}

	private connect = () => {

		this.amqp.connect(`amqp://${process.env.DOCKER_MACHINE_IP}:5672`, (err, queueConnection) => {
			if (err) {
				return;
			}

			this.connection = queueConnection;

			// Sometime the retrys - we are connected
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
	}

	public sendToQueue = (msg: string) => {
		// Any hiccups from RabbitMQ and the process exits
		if (!this.channel.sendToQueue(this.queueName, Buffer.from(msg), { persistent: true })) {
			console.log(`${this.queueName} not available...aborting`);
			process.exit(-1);
		}
	}

	public close = () => {
		console.log('Close queue connection');
		this.connection ? this.connection.close() : _.noop;
	}
}
