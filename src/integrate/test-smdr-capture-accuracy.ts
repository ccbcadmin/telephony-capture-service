#!/usr/bin/env node

import * as $ from "../share/constants";
import { ClientSocket } from "../share/client-socket";
import { Queue } from "../share/queue";

const routineName = "test-smdr-capture-accuracy";
const pgp = require("pg-promise")();

const _ = require("lodash");
const net = require("net");
const eventEmitter = require("events").EventEmitter;
const ee = new eventEmitter;

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num} = envalid;

const env = envalid.cleanEnv(process.env, {
	TCS_PORT: num(),
	DATABASE: str(),
	DB_QUEUE: str()
});

const stringOccurrences = (string, subString, allowOverlapping = false): number => {

	string += "";
	subString += "";
	if (subString.length <= 0) return (string.length + 1);

	var n = 0,
		pos = 0,
		step = allowOverlapping ? 1 : subString.length;

	while (true) {
		pos = string.indexOf(subString, pos);
		if (pos >= 0) {
			++n;
			pos += step;
		} else break;
	}
	return n;
}

// Prepare some test streams whose boundaries do not correspond to the boundaries of an SMDR message
const test1SmdrMessages = new Buffer("\
2015/03/01 00:54:10,00:00:45,5,16046150477,I,203,,,0,1008741,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:06:28,00:03:37,6,6044301510,I,203,,,0,1008742,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:12:25,00:05:19,6,,I,203,,,0,1008743,0,E217,Volunteer8,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:21:24,00:00:00,18,6042904566,I,206,,,0,1008745,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:18:00,00:06:23,5,6046136447,I,206,,,0,\
", 'ascii');
const test2SmdrMessages = new Buffer("\
1008744,0,E218,Volunteer9,T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:27:10,00:00:14,21,,I,203,,,0,1008746,0,T9001,Line 1.0,V9542,VM Channel 42,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:39:34,00:00:00,13,7785934953,I,206,,,0,1008749,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:28:55,00:11:03,5,6045007440,I,206,,,0,1008747,0,E218,Volunteer9,T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:54:10,00:00:45,5,16046150477,I,203,,,0,1008741,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:06:28,00:03:37,6,6044301510,I,203,,,0,1008742,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:12:25,00:05:19,6,,I,203,,,0,1008743,0,E217,Volunteer8,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:21:24,00:00:00,18,6042904566,I,206,,,0,1008745,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:18:00,00:06:23,5,6046136447,I,206,,,0,1008744,0,E218,Volunteer9,T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:27:10,00:00:14,21,,I,203,,,0,1008746,0,T9001,Line 1.0,V9542,VM Channel 42,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:39:34,00:00:00,13,7785934953,I,206,,,0,1008749,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:28:55,00:11:03,5,6045007440,I,206,,,0,1008747,0,E218,Volunteer9,\
", 'ascii');
const test3SmdrMessages = new Buffer("\
T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:54:10,00:00:45,5,16046150477,I,203,,,0,1008741,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:06:28,00:03:37,6,6044301510,I,203,,,0,1008742,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:12:25,00:05:19,6,,I,203,,,0,1008743,0,E217,Volunteer8,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:21:24,00:00:00,18,6042904566,I,206,,,0,1008745,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:18:00,00:06:23,5,6046136447,I,206,,,0,1008744,0,E218,Volunteer9,T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:27:10,00:00:14,21,,I,203,,,0,1008746,0,T9001,Line 1.0,V9542,VM Channel 42,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:39:34,00:00:00,13,7785934953,I,206,,,0,1008749,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:28:55,00:11:03,5,6045007440,I,206,,,0,1008747,0,E218,Volunteer9,T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
", 'ascii');

let smdrMsgsSent: number = 0;
const tcsSocket = new ClientSocket("PBX->TCS", "localhost", env.TCS_PORT);
const sendSmdrRecords = (testMsgs: Buffer): void => {

	console.log('length of testMsgs: ', testMsgs.length);
	smdrMsgsSent += stringOccurrences(testMsgs.toString(), "\x0d\x0a");
	console.log('msgCount: ', smdrMsgsSent);

	if (!tcsSocket.write(testMsgs)) {
		console.log("Link to TCS unavailable...aborting.");
		process.exit(1);
	}
}

const connection = {
	host: "localhost",
	port: 5432,
	database: env.DATABASE,
	user: "postgres"
};

const db = pgp(connection);

const checkSmdrCount = (response) => {
	console.log(response.count);
	if (response.count === smdrMsgsSent) {
		console.log(`Passed: ${smdrMsgsSent} messages sent and received`);
		process.exit(0);
	}
	else {
		console.log(`Failed: ${smdrMsgsSent} messages sent and ${response.count} received`);
		process.exit(1);
	}
}

const databaseCheck = () => {

	db.one("select count(*) from smdr;")
		.then(response => { checkSmdrCount(response) })
		.catch(error => {
			console.log("Postgres query failed: ", JSON.stringify(error));
			process.exit(1);
		});
};

// Empty the smdr table (start with a clean sheet)
db.none("delete from smdr;")
	.then(() => _.noop)
	.catch(error => {
		console.log("database purge error: ", JSON.stringify(error));
		process.exit(1);
	});

// Connect to DB_QUEUE only to purge it
const databaseQueue = new Queue(env.DB_QUEUE, null, null, null);

setTimeout(() => {

	// Start from a clean sheet
	databaseQueue.purge();

	// Send some canned messages
	sendSmdrRecords(test1SmdrMessages);
	sendSmdrRecords(test2SmdrMessages);
	sendSmdrRecords(test3SmdrMessages);

	sendSmdrRecords(test1SmdrMessages);
	sendSmdrRecords(test2SmdrMessages);
	sendSmdrRecords(test3SmdrMessages);

	sendSmdrRecords(test1SmdrMessages);
	sendSmdrRecords(test2SmdrMessages);
	sendSmdrRecords(test3SmdrMessages);

	sendSmdrRecords(test1SmdrMessages);
	sendSmdrRecords(test2SmdrMessages);
	sendSmdrRecords(test3SmdrMessages);

	// Wait a bit and then check the database
	setTimeout(() => {
		databaseCheck();
	}, 2000);

}, 2000);
