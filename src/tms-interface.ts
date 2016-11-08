#!/usr/bin/env node

import { CRLF, SMDR_PREAMBLE, TMS_QUEUE } from './share/constants';
import { ClientSocket } from './share/client-socket';
import { Queue } from './share/queue';

export namespace TmsInterface {

	const routineName = 'tms-interface';

	// ToDo: Pass TMS_HOST & TMS_PORT in as params from Docker
	const TMS_HOST = '192.168.1.69';
	const TMS_PORT = 6543;

	console.log(`${routineName}: Started`);

	process.on('SIGTERM', () => {
		console.log(`${routineName}: Terminated`);
		process.exit(0);
	});

	const clientSocket = new ClientSocket('TMS/IF<=>TMS', process.env.TMS_HOST, process.env.TMS_PORT);

	const dataSink = msg =>
		clientSocket.write(msg.content.toString());

	let tmsQueue;

	// Prepare to startup
	setTimeout(() => {
		tmsQueue = new Queue(TMS_QUEUE, dataSink);
	}, process.env.STARTUP_DELAY);
}
