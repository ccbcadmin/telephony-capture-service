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

	let leftOver: string = '';

	const queueCompleteMessages = (data: Buffer) => {

		const unprocessedData = leftOver + data;

		const crLfIndexOf = unprocessedData.indexOf(CRLF);

		const msg = unprocessedData.match(/\x00\x02\x00\x00\x00\x00(.+)\x0d\x0a/);

		if (msg) {
			databaseQueue.sendToQueue(msg[1]);
			leftOver = unprocessedData.slice(crLfIndexOf + 2);
		} else {
			leftOver = unprocessedData.slice(0);
		}
	}

	// All incoming messages are send to both queues
	const dataSink = data => {
		// Unfiltered received data is immediately sent on to the Legacy Call Management Interface
		smdrQueue.sendToQueue(data);

		// However, only true messages are sent to be archived
		queueCompleteMessages(data);
	}

	// Before starting message reception, wait to ensure that the queues are ready
	setTimeout(() => {
		new ServerSocket('Telephony Capture Service', 9001, dataSink);
	}, 1000);
}
