#!/usr/bin/env node

import { CRLF, SMDR_PREAMBLE, SMDR_QUEUE } from './constants';
import { ClientSocket } from './share/client-socket';
import { Queue } from './share/queue';

export namespace LegacyCallMananagementInterface {

	const routineName = 'Legacy Call Management Inteface';
	const HOST = '127.0.0.1';
	const CRLF = '\r\n';

	console.log(`${routineName}: Started`);

	process.on('SIGTERM', () => {
		console.log(`${routineName}: Terminated`);
		process.exit(0);
	});

	const clientSocket = new ClientSocket('LCMSIM<=>LCM', HOST, 9002);

	const dataSink = msg =>
		clientSocket.write(SMDR_PREAMBLE + msg.content.toString() + CRLF);

	const smdrQueue = new Queue(SMDR_QUEUE, dataSink);
}
