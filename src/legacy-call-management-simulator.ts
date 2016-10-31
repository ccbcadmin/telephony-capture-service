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

	let leftOver: string = '';
	const dataDump = (data: string) => {

		const unprocessedData = leftOver.slice(0) + data.slice(0);

		const crLfIndexOf = unprocessedData.indexOf(CRLF);

		const msg = unprocessedData.match(/\x00\x02\x00\x00\x00\x00(.+)\x0d\x0a/);

		if (msg) {
			// Dump the data to stdout
			process.stdout.write(msg[1] + CRLF);
			leftOver = unprocessedData.slice(crLfIndexOf + 2);

		} else {
			leftOver = unprocessedData.slice(0);
		}
	}

	new ServerSocket('Legacy Call Management Simulator', 9002, dataDump);
}
