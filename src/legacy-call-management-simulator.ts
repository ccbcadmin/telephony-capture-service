import { CRLF, SMDR_PREAMBLE } from './constants';
import { ServerSocket } from './share/server-socket';

export namespace LegacyCallManagementSimulator {

	const net = require('net');

	process.on('SIGTERM', () => {
		console.log('LegacyCallManagementSimulator terminated');
		process.exit(0);
	});

	process.on('SIGINT', () => {
		console.log("Ctrl-C received. LegacyCallManagementSimulator terminating");
		process.exit(0);
	});

	const dataDump = (msg: string) => {
		process.stdout.write(msg + CRLF);
	}

	new ServerSocket('Legacy Call Management Simulator', 9002, dataDump);
}




