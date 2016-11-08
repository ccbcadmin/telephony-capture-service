import { CRLF, DATABASE_QUEUE, SMDR_PREAMBLE, TMS_QUEUE } from './share/constants';
import { ServerSocket } from './share/server-socket';
import { Queue } from './share/queue';
import { networkIP } from './share/utility';

export namespace TelephonyCaptureService {

	const routineName = 'telephony-capture-service';

	// Need the docker machine IP to link together the various Microservices
	const net = require('net');

	if (!net.isIP(process.env.DOCKER_MACHINE_IP)) {
		console.log(`${routineName}; Invalid Docker Machine IP: ${process.env.DOCKER_MACHINE_IP}.  Aborting.`);
		process.exit(-1);
	}

	// Master enable/disable switch on the interface to the TMS
	const isTmsEnabled: boolean = process.env.TMS_ACTIVE === "true" ? true : false;

	let tmsInterfaceChildProcess;
	let databaseChildProcess;

	const receive = require('child_process');
	if (isTmsEnabled) {
		tmsInterfaceChildProcess = receive.fork(`./lib/tms-interface`);
		console.log('tmsInterfaceChildProcess Started');
	}
	databaseChildProcess = receive.fork(`./lib/database-interface`);
	console.log('databaseChildProcess Started');

	process.on('SIGTERM', () => {
		console.log('Telephony Capture Service: Terminated');
		tmsInterfaceChildProcess.kill('SIGTERM');
		databaseChildProcess.kill('SIGTERM');
		process.exit(0);
	});

	process.on('SIGINT', () => {
		console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
		tmsInterfaceChildProcess.kill('SIGTERM');
		databaseChildProcess.kill('SIGTERM');
		process.exit(0);
	});

	let tmsQueue;
	let databaseQueue;

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
		if (isTmsEnabled) {
			tmsQueue.sendToQueue(data);
		}

		// However, only true SMDR data is queued for databaase archiving
		queueCompleteMessages(data);
	}

	// Before starting message reception, wait to ensure that the queues are ready
	setTimeout(() => {
		if (isTmsEnabled) {
			tmsQueue = new Queue(TMS_QUEUE, null);
		}
		databaseQueue = new Queue(DATABASE_QUEUE, null);
		new ServerSocket('Telephony Capture Service', networkIP, 3456, dataSink);
	}, process.env.DELAY_STARTUP);
}
