#!/usr/bin/env node

import { CRLF, SMDR_PREAMBLE, SMDR_QUEUE } from './constants';
import { ClientSocket } from './share/client-socket';
import { Queue } from './share/queue';

export namespace LegacyCallMananagementInterface {

	const routineName = 'Legacy Call Management Inteface';
	const HOST = '127.0.0.1';
	const PORT = 9002;

	console.log(`${routineName}: Started`);

	process.on('SIGTERM', () => {
		console.log(`${routineName}: Terminated`);
		process.exit(0);
	});

	const clientSocket = new ClientSocket('LCMSIM<=>LCM', HOST, PORT);

	const dataSink = msg =>
		clientSocket.write(msg.content.toString());

	const smdrQueue = new Queue(SMDR_QUEUE, dataSink);
}
