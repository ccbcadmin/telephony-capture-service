#!/usr/bin/env node
// tslint:disable: indent

import { ClientSocket, createClient } from "../share/client-socket";
import { Queue } from "../share/queue";
import { sleep } from "../share/util";
import { trace } from "../Barrel";

const routineName = "test-smdr-capture-accuracy";
const pgp = require("pg-promise")();

const _ = require("lodash");
const net = require("net");
const eventEmitter = require("events").EventEmitter;
const ee = new eventEmitter;

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;

const env = envalid.cleanEnv(process.env, {
	TCS_PORT: num(),
	DATABASE: str(),
	DB_QUEUE: str()
});

const stringOccurrences = (
	str: string,
	subString: string,
	allowOverlapping = false): number => {

	str += "";
	subString += "";
	if (subString.length <= 0) return (str.length + 1);

	let n = 0,
		pos = 0,
		step = allowOverlapping ? 1 : subString.length;

	while (true) {
		pos = str.indexOf(subString, pos);
		if (pos >= 0) {
			++n;
			pos += step;
		} else break;
	}
	return n;
}

// Prepare some test streams whose boundaries do not correspond to the boundaries of an SMDR message
const test1SmdrMessages = new Buffer("\
2015/03/01 00:54:10,00:00:45,5,16046150477,I,203,6041234567,,1,1008741,0,E218,Volunteer9,T9001,Line 1.0,120,150,17,18,19,20,21,22,23,24,25,26,Cause1,Target1,Number1\x0d\x0a\
2015/03/01 01:06:28,00:03:37,6,6044301510,I,203,,,1,1008742,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
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
2015/03/01 03:28:55,00:11:03,5,6045007440,O,206,,,0,1008747,0,E218,Volunteer9,T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
", 'ascii');

let smdrMsgsSent: number = 0;
let tcsClient: ClientSocket;

const sendSmdrRecords = (testMsgs: Buffer): void => {

	smdrMsgsSent += stringOccurrences(testMsgs.toString(), "\x0d\x0a");

	if (!tcsClient.write(testMsgs)) {
		trace("Link to TCS unavailable...aborting.");
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

const testSelect = (query: string, expected: number): Promise<any> =>

	new Promise((resolve, reject) =>

		db.one(query)
			.then((response: any) => {
				trace(query);
				if (response.count == expected) {
					resolve('... passed');
				}
				else {
					reject(`Query Failure: ${query}, ${response.count} Returned, ${expected} Expected`);
				}
			})
			.catch((error: Error) => reject(error)));

const databaseCheck = () => {

	testSelect("select count(*) from smdr;", smdrMsgsSent)
		.then(() => testSelect("select count(*) from smdr where connected_time = '319 seconds'::INTERVAL;", 3))
		.then(() => testSelect("select count(*) from smdr where ring_time = '5 seconds'::INTERVAL;", 9))
		.then(() => testSelect("select count(*) from smdr where caller = '6044301510';", 3))
		.then(() => testSelect("select count(*) from smdr where direction = 'I';", 23))
		.then(() => testSelect("select count(*) from smdr where direction = 'O';", 1))
		.then(() => testSelect("select count(*) from smdr where called_number = '203';", 12))
		.then(() => testSelect("select count(*) from smdr where called_number = '206';", 12))
		.then(() => testSelect("select count(*) from smdr where dialed_number = '6041234567';", 1))
		.then(() => testSelect("select count(*) from smdr where dialed_number = '';", 23))
		.then(() => testSelect("select count(*) from smdr where is_internal = '0';", 22))
		.then(() => testSelect("select count(*) from smdr where is_internal = '1';", 2))
		.then(() => testSelect("select count(*) from smdr where call_id = '1008741';", 3))
		.then(() => testSelect("select count(*) from smdr where continuation = '0';", 24))
		.then(() => testSelect("select count(*) from smdr where party_1_device = 'E218';", 12))
		.then(() => testSelect("select count(*) from smdr where party_1_device = 'T9001';", 3))
		.then(() => testSelect("select count(*) from smdr where party_1_name = 'Volunteer9';", 12))
		.then(() => testSelect("select count(*) from smdr where party_1_name = 'Volunteer8';", 3))
		.then(() => testSelect("select count(*) from smdr where party_2_device = 'T9015';", 6))
		.then(() => testSelect("select count(*) from smdr where party_2_device = 'T9001';", 9))
		.then(() => testSelect("select count(*) from smdr where party_2_name = 'Line 15.0';", 6))
		.then(() => testSelect("select count(*) from smdr where party_2_name = 'VM Channel 42';", 3))
		.then(() => testSelect("select count(*) from smdr where hold_time = '120 seconds'::INTERVAL;", 1))
		.then(() => testSelect("select count(*) from smdr where hold_time = '0 seconds'::INTERVAL;", 23))
		.then(() => testSelect("select count(*) from smdr where park_time = '150 seconds'::INTERVAL;", 1))
		.then(() => testSelect("select count(*) from smdr where park_time = '0 seconds'::INTERVAL;", 23))
		.then(() => testSelect("select count(*) from smdr where EXTERNAL_TARGETING_CAUSE = 'Cause1';", 1))
		.then(() => testSelect("select count(*) from smdr where EXTERNAL_TARGETING_CAUSE = '';", 23))
		.then(() => testSelect("select count(*) from smdr where EXTERNAL_TARGETER_ID = 'Target1';", 1))
		.then(() => testSelect("select count(*) from smdr where EXTERNAL_TARGETER_ID = '';", 23))
		.then(() => testSelect("select count(*) from smdr where EXTERNAL_TARGETED_NUMBER = 'Number1';", 1))
		.then(() => testSelect("select count(*) from smdr where EXTERNAL_TARGETED_NUMBER = '';", 23))
		.then(() => { trace('Exiting Pass'); process.exit(0); })
		.catch(error => { trace(JSON.stringify(error, null, 4)); process.exit(1); });
};

const sendData = () => {

	// Send some canned messages
	sendSmdrRecords(test1SmdrMessages);
	sendSmdrRecords(test2SmdrMessages);
	sendSmdrRecords(test3SmdrMessages);

	// Wait a bit and then check the database
	sleep(2000).then(databaseCheck);
}

// Connect to DB_QUEUE only to purge it
const databaseQueue = new Queue(env.DB_QUEUE);
sleep(2000)
	.then(databaseQueue.purge)
	.then(() => db.none("delete from smdr;"))
	.then(() => createClient("pbx=>tcs", "localhost", env.TCS_PORT, sendData))
	.then((client: ClientSocket) => tcsClient = client)
	.catch(error => { trace(JSON.stringify(error, null, 4)); process.exit(1); });
