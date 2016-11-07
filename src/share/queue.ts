
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

		this.amqp.connect('amqp://192.168.99.100:5672', (err, queueConnection) => {
			if (err) {
				console.log('Unable to Connect to Message Broker: ', err);
				process.exit(0);
			}

			queueConnection.createChannel((err, channel) => {

				if (err) {
					console.log(`Cannot create channel for Queue ${this.queueName}: `, err);
					process.exit(0);
				}

				console.log (`Channel to Message Broker for Queue ${this.queueName} Created`);

				channel.assertQueue(queueName, { durable: true });
				this.channel = channel;

				if (this.consumer) {

					channel.consume(queueName, msg => {

						++this.messageCounter;

						//console.log(`${messageCounter}: ${msg.content.toString()}`);
						this.consumer(msg) ? channel.ack(msg) : channel.nack(msg);

					}, { noAck: false });
				}

				this.ready = true;
			});
		});
	}

	public sendToQueue = (msg: string) => {
		if (this.ready) {
			this.channel.sendToQueue(this.queueName, new Buffer(msg), { persistent: true });
		}
		else {
			console.log(`Queue ${this.queueName} not ready - Aborting`);
			process.exit(0);
		}
	}
}
