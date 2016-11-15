#!/usr/bin/env node

import { CRLF, DATABASE_QUEUE, SMDR_PREAMBLE, TMS_QUEUE } from './share/constants';
import { ClientSocket } from './share/client-socket';
import { Queue } from './share/queue';

export namespace DatabaseInterface {

	const routineName = 'database-interface';

	const moment = require('moment');
	const _ = require('lodash');
	const pgp = require('pg-promise')();

	// Ensure the presence of required environment variables
	const envalid = require('envalid');
	const { str, num } = envalid;
	const env = envalid.cleanEnv(process.env, {
		DOCKER_MACHINE_IP: str(),
		POSTGRES_PORT: num()
	});

	interface SmdrRecord {
		callStart: string,
		connectedTime: string,
		ringTime: string,
		caller: string,
		direction: string,
		calledNumber: string,
		dialedNumber: string,
		isInternal: string,
		callId: string,
		continuation: string,
		party1Device: string,
		party1Name: string,
		party2Device: string,
		party2Name: string,
		holdTime: string,
		parkTime: string,
		externalTargetingCause: string,
		externalTargeterId: string,
		externalTargetedNumber: string
	};

	let connection = {
		host: env.DOCKER_MACHINE_IP,
		port: env.POSTGRES_PORT,
		database: 'postgres',
		user: 'postgres',
		password: ''
	};

	const db = pgp(connection);

	const insertCallRecords = (smdrRecord: SmdrRecord) =>
		db.none(`INSERT INTO RAW_CALL2 (
					CALL_TIME, 
					CONNECTED_TIME,
					RING_TIME,
					CALLER,
					DIRECTION,
					CALLED_NUMBER,
					DIALED_NUMBER,
					IS_INTERNAL,
					CALL_ID,
					CONTINUATION,
					PARTY_1_DEVICE,
					PARTY_1_NAME,
					PARTY_2_DEVICE,
					PARTY_2_NAME,
					HOLD_TIME,
					PARK_TIME,
					EXTERNAL_TARGETING_CAUSE,
					EXTERNAL_TARGETER_ID,
					EXTERNAL_TARGETED_NUMBER)
    			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
			[
				smdrRecord.callStart,
				smdrRecord.connectedTime,
				smdrRecord.ringTime,
				smdrRecord.caller,
				smdrRecord.direction,
				smdrRecord.calledNumber,
				smdrRecord.dialedNumber,
				smdrRecord.isInternal,
				smdrRecord.callId,
				smdrRecord.continuation,
				smdrRecord.party1Device,
				smdrRecord.party1Name,
				smdrRecord.party2Device,
				smdrRecord.party2Name,
				smdrRecord.holdTime,
				smdrRecord.parkTime,
				smdrRecord.externalTargetingCause,
				smdrRecord.externalTargeterId,
				smdrRecord.externalTargetedNumber
			]);

	console.log(`${routineName}: Started`);

	process.on('SIGTERM', (): void => {
		console.log(`${routineName}: Terminated`);
		process.exit(0);
	});

	let badRawRecords = 0;

	const dataSink = (msg): boolean => {

		let raw_call = msg.content.toString().split(',');

		if (raw_call.length !== 30) {
			++badRawRecords;
		} else {

			//let callStart: string = moment(raw_call[0]).format();
			let callStart = raw_call[0];
			// console.log('Call Start: ', callStart);

			// Record Connected Time in seconds
			let temp: string[] = raw_call[1].split(':');
			let connectedTime = String(
				Number(temp[0]) * 60 * 60 +
				Number(temp[1]) * 60 +
				Number(temp[2]));
			// console.log('Connected Time (seconds): ', connectedTime);

			// Ring Time in seconds
			let ringTime = raw_call[2];

			let caller = raw_call[3];
			// console.log('Caller: ', caller);

			let direction = raw_call[4];
			// console.log('Direction: ', direction);

			let calledNumber = raw_call[5];
			// console.log('Called Number: ', calledNumber);

			let dialedNumber = raw_call[6];
			// console.log('Dialed Number: ', dialedNumber);

			let isInternal = raw_call[8];
			// console.log('Is Internal: ', isInternal);

			let callId = raw_call[9];
			// console.log('Call ID: ', callId);

			let continuation = raw_call[10];
			// console.log('Continuation: ', continuation);

			let party1Device = raw_call[11];
			// console.log('Party 1 Device: ', party1Device);

			let party1Name = raw_call[12];
			// console.log('Party 1 Name: ', party1Name);

			let party2Device = raw_call[13];
			// console.log('Party 2 Device: ', party2Device);

			let party2Name = raw_call[14];
			// console.log('Party 2 Name: ', party2Name);

			let holdTime = raw_call[15];
			// console.log('Hold Time: ', holdTime);

			let parkTime = raw_call[16];
			// console.log('Park Time: ', parkTime);

			let externalTargetingCause = raw_call[27];
			// console.log('External Targetting Cause: ', externalTargetingCause);

			let externalTargeterId = raw_call[28];
			// console.log('External TargeterId: ', externalTargeterId);

			let externalTargetedNumber = raw_call[29];
			// console.log('External Targeted Number: ', externalTargetedNumber);

			let smdrRecord: SmdrRecord = {
				callStart: callStart,
				connectedTime: connectedTime,
				ringTime: ringTime,
				caller: caller,
				direction: direction,
				calledNumber: calledNumber,
				dialedNumber: dialedNumber,
				isInternal: isInternal,
				callId: callId,
				continuation: continuation,
				party1Device: party1Device,
				party1Name: party1Name,
				party2Device: party2Device,
				party2Name: party2Name,
				holdTime: holdTime,
				parkTime: parkTime,
				externalTargetingCause: externalTargetingCause,
				externalTargeterId: externalTargeterId,
				externalTargetedNumber: externalTargetedNumber
			};

			insertCallRecords(smdrRecord)
				// If everything OK, then move on to the next line of the file
				.then(() => {
					// console.log('stored to database success');
					return true;
				})
				.catch(err => {
					console.log('Database Insert Failure: ', err);
					return false;
				});

		}
		return true;
	}

	const databaseQueue = new Queue(DATABASE_QUEUE, dataSink);
}
