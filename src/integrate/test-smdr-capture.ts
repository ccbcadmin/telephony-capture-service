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

const sendSmdrRecords = (smdrFileName: string): void => {

	let data: Buffer = fs.readFileSync(smdrFileName);

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

const connection = {
	host: 'localhost',
	port: 5432,
	database: env.DATABASE,
	user: 'postgres'
};

const db = pgp(connection);

const checkRecordCount = () => {

	db.one('select count(*) from smdr;')
		.then(response => {
			console.log(response.count);
			if (response.count == smdrMsgsSent) {
				console.log(`Passed: ${smdrMsgsSent} messages sent and received`);
				process.exit(0);
			}
			else {
				console.log(`Failed: ${smdrMsgsSent} messages sent and ${response.count} received`);
				process.exit(1);
			}
		})
		.catch(error => {
			console.log('Postgres query failed:\n', JSON.stringify(error));
			process.exit(1);
		});
}

const nextFile = () => {
	if (smdrFileNo === smdrFiles.length) {

		// Wait a bit and then confirm the count in the database
		setTimeout(checkRecordCount, 10000);
	}
	else {
		sendSmdrRecords(smdrFiles[smdrFileNo]);
		++smdrFileNo;
	}
}

ee.on('next', nextFile);

// Connect to DB_QUEUE only to purge it
const databaseQueue = new Queue(env.DB_QUEUE);

db.none('delete from smdr;')
	.then(() => _.noop)
	.catch(error => {
		console.log('database purge error: ', JSON.stringify(error));
		process.exit(1);
	});

// Wait a bit to ensure the queue is empty, then proceed
setTimeout(() => {

	// Start from a clean sheet
	databaseQueue.purge();

	// Search the source directory looking for raw SMDR files
	dir.files('./sample-data/smdr-data/smdr-one-file', (err, files) => {
		if (err) throw err;

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
