import { CRLF, DATABASE_QUEUE, SMDR_PREAMBLE, TMS_QUEUE } from './share/constants';
import { ServerSocket } from './share/server-socket';
import { Queue } from './share/queue';
import { networkIP } from './share/utility';

export namespace TelephonyCaptureService {

	const routineName = 'telephony-capture-service';

	// Ensure the presence of required environment variables
	const envalid = require('envalid');
	const { str, num } = envalid;
	const env = envalid.cleanEnv(process.env, {
		DOCKER_MACHINE_IP: str(),
		STARTUP_DELAY: num(),
		TMS_ACTIVE: num()
	});

	// Need the docker machine IP to link together the various Microservices
	const net = require('net');

	if (!net.isIP(env.DOCKER_MACHINE_IP)) {
		console.log(`${routineName}; Invalid Docker Machine IP: ${env.DOCKER_MACHINE_IP}.  Aborting.`);
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
			console.log('msg[0].lenght, [1].lenght: ', msg[0].length, msg[1].length);

			databaseQueue.sendToQueue(msg[1]);
			leftOver = unprocessedData.slice(crLfIndexOf + 2);
		} else {
			leftOver = unprocessedData.slice(0);
		}
	}

	const dataSink = (data: Buffer) => {

		// Unfiltered data is queued for subsequent transmission to the legacy TMS
		if (env.TMS_ACTIVE) {
			tmsQueue.sendToQueue(data.toString());
		}

		// However, only true SMDR data is queued for databaase archiving
		queueCompleteMessages(data);
	}

	// Before starting message reception, wait to ensure that the queues are ready
	setTimeout(() => {
		if (env.TMS_ACTIVE) {
			tmsQueue = new Queue(TMS_QUEUE, null);
		}
		databaseQueue = new Queue(DATABASE_QUEUE, null);
		new ServerSocket(routineName, networkIP, 3456, dataSink);
	}, env.STARTUP_DELAY);
}
