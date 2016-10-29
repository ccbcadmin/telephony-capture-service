import { CRLF, DATABASE_QUEUE, SMDR_PREAMBLE, SMDR_QUEUE } from './constants';
import { ServerSocket } from './share/server-socket';
import { Queue } from './share/queue';

export namespace TelephonyCaptureService {

	const amqp = require('amqplib/callback_api');
	const receive = require('child_process');
	const child = receive.fork('./lib/legacy-call-management-interface');
	const net = require('net');

	process.on('SIGTERM', () => {
		console.log('Telephony Capture Service: Terminated');
		child.kill('SIGTERM');
		process.exit(0);
	});

	process.on('SIGINT', () => {
		console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
		child.kill('SIGTERM');
		process.exit(0);
	});

	const smdrQueue = new Queue(SMDR_QUEUE, null);
	const databaseQueue = new Queue(DATABASE_QUEUE, null);

	// All incoming messages are send to both queues
	const dataSink = msg => {
		smdrQueue.sendToQueue(msg);
		databaseQueue.sendToQueue(msg);
	}

	// Before starting message reception, wait to ensure that the queues are ready
	setTimeout(() => {
		new ServerSocket('Telephony Capture Service', 9001, dataSink);
	}, 1000);
}
