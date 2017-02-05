#!/usr/bin/env node

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import * as $ from '../share/constants';
import { ClientSocket } from '../share/client-socket';
import { Queue } from '../share/queue';

const routineName = 'pbx-simulator';
const pgp = require('pg-promise')();

const _ = require('lodash');
const net = require('net');
const fs = require('fs');
const dir = require('node-dir');
const eventEmitter = require('events').EventEmitter;
const ee = new eventEmitter;

// Ensure the presence of required environment variables
const envalid = require('envalid');
const { str, num} = envalid;

const env = envalid.cleanEnv(process.env, {
	TCS_PORT: num(),
	DATABASE: str(),
	DB_QUEUE: str()
});

let smdrFiles: string[] = [];
let smdrFileNo = 0;
let smdrMsgsSent: number = 0;

const tcsSocket = new ClientSocket('PBX->TCS', 'localhost', env.TCS_PORT);

let txMessagesBuffer = Buffer.alloc(0);
let rxMessagesBuffer = Buffer.alloc(0);

const sendSmdrRecords = (smdrFileName: string): void => {

	let data: Buffer = fs.readFileSync(smdrFileName);

	// Accummulate data in one large buffer for later comparison
	txMessagesBuffer = Buffer.concat([txMessagesBuffer, data], txMessagesBuffer.length + data.length);

	process.stdout.write('Sending ' + smdrFileName + '  ');

	let index: number = 0;
	let next_index: number = 0;

	const intervalId = setInterval(() => {
		// Look for SMDR record boundaries until there are no more
		if ((next_index = data.indexOf($.CRLF, index)) < 0) {
			process.stdout.write(`\bis complete.  ${smdrMsgsSent} SMDR records sent.\r\n`);
			clearInterval(intervalId);
			ee.emit('next');
		} else {
			++smdrMsgsSent;
			const nextMsg = data.slice(index, next_index + 2);

			/*
			if (smdrMsgsSent % 20 === 5)
				process.stdout.write('\b-');
			else if (smdrMsgsSent % 20 === 10)
				process.stdout.write('\b\\');
			else if (smdrMsgsSent % 20 === 15)
				process.stdout.write('\b|');
			else if (smdrMsgsSent % 20 === 0)
				process.stdout.write('\b/');
			*/

			index = next_index + 2;

			// Randomly partition socket writes to ensure TCS handles gracefully
			const partition = Math.floor(Math.random() * nextMsg.length);
			const firstPart = nextMsg.slice(0, partition);
			const secondPart = nextMsg.slice(partition);

			if (!tcsSocket.write(firstPart) || !tcsSocket.write(secondPart)) {
				console.log('Link to TCS unavailable...aborting.');
				process.exit(-1);
			}
		}
	}, 2);
}


const compareFiles = () => {

	console.log('Compare Files');

	dir.files('/smdr-data/smdr-data-001', (error, files) => {

		if (error) {
			console.log(JSON.stringify(error, null, 4));
			process.exit(1);
		}

		files.forEach(file => {

			console.log('filename: ', file);

			fs.readFile(file, (error, data) => {


				if (error) {
					console.log(JSON.stringify(error, null, 4));
					process.exit(1);
				}

				else {
					console.log('Length of data: ', data.length);

					// Accummulate all the data into one buffer
					rxMessagesBuffer = Buffer.concat([rxMessagesBuffer, data], rxMessagesBuffer.length + data.length);

					console.log('result: ', txMessagesBuffer.length, rxMessagesBuffer.length);

					if (Buffer.compare(txMessagesBuffer, rxMessagesBuffer) === 0) {
						console.log('Source Files and Target Files are identical');
						process.exit(0);
					}
					else {
						console.log('Source Files and Target Files differ');
						
						for (let i=0; i<txMessagesBuffer.length; ++i) {
							if (rxMessagesBuffer[i] != txMessagesBuffer[i]) {
								console.log ('differs at ', i);
								console.log ('txChar: ', txMessagesBuffer[i].toString(16));
								console.log ('rxChar: ', rxMessagesBuffer[i].toString(16));
							}
						}

						var strTx = '';
						for (let ii = 0; ii < 200; ii++) {
							strTx += txMessagesBuffer[ii].toString(16) + ' ';
						};
						console.log(strTx);

						var strRx = '';
						for (let ii = 0; ii < 200; ii++) {
							strRx += rxMessagesBuffer[ii].toString(16) + ' ';
						};
						console.log(strRx);

						process.exit(1);
					}
				}
			});
		});
	});
}

const nextFile = () => {
	if (smdrFileNo === smdrFiles.length) {

		// Wait a bit and then confirm the count in the database
		setTimeout(compareFiles, 10000);
	}
	else {
		sendSmdrRecords(smdrFiles[smdrFileNo]);
		++smdrFileNo;
	}
}

ee.on('next', nextFile);

// Delete all files out of the SMDR-DATA-001 directory
dir.files('/smdr-data/smdr-data-001', (error, files) => {

	if (error) {
		console.log(JSON.stringify(error, null, 4));
		process.exit(1);
	}

	files.forEach(file => {
		fs.unlink(file, (error) => {
			if (error) {
				console.log(JSON.stringify(error, null, 4));
				process.exit(1);
			}
		});
	});

});

// Wait a bit to ensure SMDR-DATA-001 has been cleared
setTimeout(() => {

	// Search the source directory looking for raw SMDR files
	dir.files('./sample-data/smdr-data/smdr-one-file', (error, files) => {

		if (error) {
			console.log(JSON.stringify(error, null, 4));
			process.exit(1);
		}

		// Deliver the data in chronological order
		files.sort();

		for (let file of files) {
			let path = file.split('\\');

			// Only interested in SMDR files
			if (path[path.length - 1].match($.REGEXP_SMDR_FILENAME)) {
				smdrFiles.push(file);
			}
		}
		nextFile();
	});
}, 5000);
