
import { networkIP } from './utility';

export class Queue {

	private amqp = require('amqplib/callback_api');
	private channel;
	private queueName: string;
	private messageCounter = 0;
	private consumer;
	private ready: boolean;

	constructor(queueName: string, consumer: any) {

		this.queueName = queueName;
		this.consumer = consumer;
		this.ready = false;

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

						console.log ('Message length: ', msg.content.toString().length);
						console.log(`${++this.messageCounter}: ${msg.content.toString()}`);
						this.consumer(msg) ? channel.ack(msg) : channel.nack(msg);

					}, { noAck: false });
				}

				this.ready = true;
			});
		});
	}

	public sendToQueue = (msg: string) => {
		if (this.ready) {
			this.channel.sendToQueue(this.queueName, Buffer.from(msg), { persistent: true });
		}
		else {
			console.log(`Queue ${this.queueName} not ready - Aborting`);
			process.exit(0);
		}
	}
}
