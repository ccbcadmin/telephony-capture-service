import { CRLF, DATABASE_QUEUE, SMDR_PREAMBLE, SMDR_QUEUE } from './constants';
import { ServerSocket } from './share/server-socket';
import { Queue } from './share/queue';
import { networkIP } from './share/utility';

export namespace TelephonyCaptureService {

	const receive = require('child_process');
	const child_process1 = receive.fork('./lib/legacy-call-management-interface');
	const child_process2 = receive.fork('./lib/load-smdr-records-into-database');

	process.on('SIGTERM', () => {
		console.log('Telephony Capture Service: Terminated');
		child_process1.kill('SIGTERM');
		child_process2.kill('SIGTERM');
		process.exit(0);
	});

	process.on('SIGINT', () => {
		console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
		child_process1.kill('SIGTERM');
		child_process2.kill('SIGTERM');
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

	const dataSink = data => {

		// Unfiltered data is queued for subsequent transmission to the legacy TMS
		smdrQueue.sendToQueue(data);

		// However, only true SMDR data is queued for databaase archiving
		queueCompleteMessages(data);
	}

	// Before starting message reception, wait to ensure that the queues are ready
	setTimeout(() => {
		new ServerSocket('Telephony Capture Service', networkIP, 3456, dataSink);
	}, 1000);
}
