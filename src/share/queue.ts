
import { networkIP } from './utility';

export class Queue {

	private amqp = require('amqplib/callback_api');
	private channel;
	private queueName: string;
	private messageCounter = 0;
	private consumer;

	constructor(queueName: string, consumer: any) {

		this.queueName = queueName;
		this.consumer = consumer;

		this.amqp.connect(`amqp://${process.env.DOCKER_MACHINE_IP}:5672`, (err, queueConnection) => {
			if (err) {
				console.log('Unable to Connect to Message Broker: ', err);
				process.exit(0);
			}

			queueConnection.createChannel((err, channel) => {

				if (err) {
					console.log(`Cannot create channel for Queue ${this.queueName}: `, err);
					process.exit(0);
				}

				console.log(`Channel to Message Broker for Queue ${this.queueName} Created`);

				channel.assertQueue(queueName, { durable: true });
				this.channel = channel;

				if (this.consumer) {

					channel.consume(queueName, msg => {

						console.log('Message length: ', msg.content.toString().length);
						console.log(`${++this.messageCounter}: ${msg.content.toString()}`);
						this.consumer(msg) ? channel.ack(msg) : channel.nack(msg);

					}, { noAck: false });
				}
			});
		});
	}

	public sendToQueue = (msg: string) => {
		// Any hiccups from RabbitMQ and the process exits
		if (!this.channel.sendToQueue(this.queueName, Buffer.from(msg), { persistent: true })) {
			console.log(`Queue ${this.queueName} not available...aborting`);
			process.exit(-1);
		}
	}
}
