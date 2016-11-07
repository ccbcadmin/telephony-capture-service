import { CRLF, SMDR_PREAMBLE } from './constants';
import { ClientSocket } from './share/client-socket';
import { regExpSmdrFileName } from './share/utility';

export namespace TelephonySimulator {

	const routineName = 'telephony-simulator';
	const _ = require('lodash');
	const net = require('net');
	const fs = require('fs');
	const dir = require('node-dir');
	const eventEmitter = require('events').EventEmitter;
	const ee = new eventEmitter;

	let smdrFiles: string[] = [];
	let smdrFileNo = 0;

	// Check the parameters
	if (process.argv.length !== 5) {
		console.log(`Usage: node lib/${routineName} SourceDirectory HostIpAddress Port`);
		process.exit(0);
	} else if (!net.isIP(process.argv[3])) {
		console.log(`telephony-simulator: ${process.argv[3]}, Invalid IP Address`);
		process.exit(0);
	}
	else if (!process.argv[4].match(/^\d+$/)) {
		console.log(`telephony-simulator: ${process.argv[4]}, Invalid Port`);
		process.exit(0);
	}

	const tscSocket = new ClientSocket('TCSSIM<=>TCS', process.argv[3], Number(process.argv[4]));

	const sendSmdrRecords = (smdrFileName: string): void => {

		let data = fs.readFileSync(smdrFileName).toString();

		process.stdout.write('Sending ' + smdrFileName + '  ');

		let index: number = 0;
		let next_index: number = 0;
		let recordCount: number = 0;

		const intervalId = setInterval(() => {
			// Look for SMDR record boundaries until there are no more
			if ((next_index = data.indexOf(CRLF, index)) < 0) {
				process.stdout.write(`\bis complete.  ${recordCount} SMDR records sent.\r\n`);
				clearInterval(intervalId);
				ee.emit('next');
			} else {
				++recordCount;
				const nextMsg = data.slice(index, next_index + 2);
				// process.stdout.write(nextMsg);

				if (recordCount % 20 === 5)
					process.stdout.write('\b-');
				else if (recordCount % 20 === 10)
					process.stdout.write('\b\\');
				else if (recordCount % 20 === 15)
					process.stdout.write('\b|');
				else if (recordCount % 20 === 0)
					process.stdout.write('\b/');

				index = next_index + 2;

				// Randomly partition socket writes to ensure TCS handles gracefully
				const partition = Math.floor(Math.random() * nextMsg.length);
				const firstPart = nextMsg.slice(0, partition);
				const secondPart = nextMsg.slice(partition);

				tscSocket.write(SMDR_PREAMBLE);
				tscSocket.write(firstPart);
				tscSocket.write(secondPart);
			}
		}, 5);
	}

	const nextFile = () => {
		if (smdrFileNo === smdrFiles.length) {
			process.exit(0);
		}
		else {
			sendSmdrRecords(smdrFiles[smdrFileNo]);
			++smdrFileNo;
		}
	}

	ee.on('next', nextFile);

	// Search the current directory, if none specified
	dir.files(process.argv[2] ? process.argv[2] : '.', (err, files) => {
		if (err) throw err;

		// Deliver the data in chronological order
		files.sort();

		for (let file of files) {
			let path = file.split('\\');

			// Only interested in SMDR files
			if (path[path.length - 1].match(regExpSmdrFileName)) {
				smdrFiles.push(file);
			}
		}
		nextFile();
	});
}
