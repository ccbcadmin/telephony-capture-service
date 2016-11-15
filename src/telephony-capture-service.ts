import { CRLF, DATABASE_QUEUE, SMDR_PREAMBLE, TMS_QUEUE } from './share/constants';
import { ServerSocket } from './share/server-socket';
import { Queue } from './share/queue';
import { networkIP } from './share/utility';

export namespace TelephonyCaptureService {

	const routineName = 'telephony-capture-service';

	const _ = require('lodash');

	// Ensure the presence of required environment variables
	const envalid = require('envalid');
	const { str, num } = envalid;
	const env = envalid.cleanEnv(process.env, {
		// Need the docker machine IP to link together the various Microservices
		DOCKER_MACHINE_IP: str(),
		TMS_ACTIVE: num(),
		TCS_PORT: num()
	});

	const net = require('net');
	if (!net.isIP(env.DOCKER_MACHINE_IP)) {
		console.log(`${routineName}; Invalid Docker Machine IP: ${env.DOCKER_MACHINE_IP}...aborting.`);
		process.exit(-1);
	}

	process.on('SIGTERM', () => {
		console.log('Telephony Capture Service: Terminated');
		process.exit(0);
	});

	process.on('SIGINT', () => {
		console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
		process.exit(0);
	});

	let tmsQueue;
	let databaseQueue;

	let leftOver: string = '';

	const queueCompleteMessages = (data: Buffer) => {

		const unprocessedData = leftOver + data.toString();

		const crLfIndexOf = unprocessedData.indexOf(CRLF);

		const msg = unprocessedData.match(/\x00\x02\x00\x00\x00\x00(.+)\x0d\x0a/);

		if (msg) {
			databaseQueue.sendToQueue(msg[1]);
			leftOver = unprocessedData.slice(crLfIndexOf + 2);
		} else {
			leftOver = unprocessedData.slice(0);
		}
	}

	const dataSink = (data: Buffer) => {

		// Unfiltered data is queued for subsequent transmission to the legacy TMS
		env.TMS_ACTIVE ? tmsQueue.sendToQueue(data.toString()) : _.noop;

		// However, only true SMDR data is queued for databaase archiving
		queueCompleteMessages(data);
	}

	// Setup the queue to the TMS if needed
	tmsQueue = env.TMS_ACTIVE ? new Queue(TMS_QUEUE) : null;

	// Always need the database queue
	databaseQueue = new Queue(DATABASE_QUEUE);

	// Start listening for incoming messages
	new ServerSocket(routineName, networkIP, env.TCS_PORT, dataSink);
}
