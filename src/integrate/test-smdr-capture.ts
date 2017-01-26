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
let recordCount: number = 0;

const tcsSocket = new ClientSocket('PBX->TCS', 'localhost', env.TCS_PORT);

const sendSmdrRecords = (smdrFileName: string): void => {

	let data: Buffer = fs.readFileSync(smdrFileName);

	process.stdout.write('Sending ' + smdrFileName + '  ');

	let index: number = 0;
	let next_index: number = 0;

	const intervalId = setInterval(() => {
		// Look for SMDR record boundaries until there are no more
		if ((next_index = data.indexOf($.CRLF, index)) < 0) {
			process.stdout.write(`\bis complete.  ${recordCount} SMDR records sent.\r\n`);
			clearInterval(intervalId);
			ee.emit('next');
		} else {
			++recordCount;
			const nextMsg = data.slice(index, next_index + 2);

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
	console.log('Record Count: ', recordCount);

	let result = -1;
	db.one('select count(*) from smdr;', result);

	console.log ('Result is: ', result);
	process.exit(0);
}

const nextFile = () => {
	if (smdrFileNo === smdrFiles.length) {

		// Wait a bit and then confirm the count in the database
		setTimeout(checkRecordCount, 3000);
	}
	else {
		sendSmdrRecords(smdrFiles[smdrFileNo]);
		++smdrFileNo;
	}
}

ee.on('next', nextFile);

// Ensure the DB_QUEUE is empty
console.log ('Clear DB_QUEUE');
const databaseQueue = new Queue(env.DB_QUEUE, () => true);

// Wait a bit to ensure the queue is empty, then proceed
setTimeout(() => {

	// Stop clearing the queue
	databaseQueue.close();

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
}, 2000);
