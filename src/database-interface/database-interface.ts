#!/usr/bin/env node
// tslint:disable: indent

import { Queue } from "../share/queue";
import {
	trace,
	ConsoleConfig,
	CloudWatchConfig,
	LogConfigRecord,
	Logger,
	logInfo,
	logFatal,
	logConfig,
} from "../Barrel";

const routineName = "database-interface";

const pgPromise = require("pg-promise");

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	DATABASE: str(),
	DB_QUEUE: str(),
});

interface SmdrRecord {
	callStart: string;
	connectedTime: string;
	ringTime: string;
	caller: string;
	direction: string;
	calledNumber: string;
	dialedNumber: string;
	isInternal: string;
	callId: string;
	continuation: string;
	party1Device: string;
	party1Name: string;
	party2Device: string;
	party2Name: string;
	holdTime: string;
	parkTime: string;
	externalTargetingCause: string;
	externalTargeterId: string;
	externalTargetedNumber: string;
}

const connection = {
	host: "localhost",
	port: 5432,
	database: env.DATABASE,
	user: "postgres"
};

const db = pgPromise(connection);

const insertCallRecords = (smdrRecord: SmdrRecord) =>
	db.none(`INSERT INTO SMDR (
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

logInfo(`${routineName}: Started`);

process.on("SIGTERM", (): void => {
	const msg = `${routineName}: Terminated`;
	logFatal(msg);
	process.exit(0);
});

let badRawRecords = 0;

const dataSink = async (msg: Buffer): Promise<boolean> => {

	try {
		let raw_call = msg.toString().split(",");

		if (raw_call.length <= 30) {
			trace(`Bad SMDR Record Length: ${raw_call.length}, Bad SMDR Records: ${++badRawRecords}`);
			++badRawRecords;
		} else {

			let callStart = raw_call[0];

			// Record Connected Time in seconds
			let temp: string[] = raw_call[1].split(":");
			let connectedTime = String(
				Number(temp[0]) * 60 * 60 +
				Number(temp[1]) * 60 +
				Number(temp[2]));
			// trace('Connected Time (seconds): ', connectedTime);

			// Ring Time in seconds
			let ringTime = raw_call[2];

			let caller = raw_call[3];
			// trace('Caller: ', caller);

			let direction = raw_call[4];
			// trace('Direction: ', direction);

			let calledNumber = raw_call[5];
			// trace('Called Number: ', calledNumber);

			let dialedNumber = raw_call[6];
			// trace('Dialed Number: ', dialedNumber);

			let isInternal = raw_call[8];
			// trace('Is Internal: ', isInternal);

			let callId = raw_call[9];
			// trace('Call ID: ', callId);

			let continuation = raw_call[10];
			// trace('Continuation: ', continuation);

			let party1Device = raw_call[11];
			// trace('Party 1 Device: ', party1Device);

			let party1Name = raw_call[12];
			// trace('Party 1 Name: ', party1Name);

			let party2Device = raw_call[13];
			// trace('Party 2 Device: ', party2Device);

			let party2Name = raw_call[14];
			// trace('Party 2 Name: ', party2Name);

			let holdTime = raw_call[15];
			// trace('Hold Time: ', holdTime);

			let parkTime = raw_call[16];
			// trace('Park Time: ', parkTime);

			let externalTargetingCause = raw_call[27];
			// trace('External Targetting Cause: ', externalTargetingCause);

			let externalTargeterId = raw_call[28];
			// trace('External TargeterId: ', externalTargeterId);

			let externalTargetedNumber = raw_call[29];
			// trace('External Targeted Number: ', externalTargetedNumber);

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

			await insertCallRecords(smdrRecord);
		}
		return true;
	} catch (err) {
		trace("Database Insert Failure: ", err);
		return true;
	}
};

try {

	new Queue(env.DB_QUEUE, dataSink);

	const msg = `(${routineName}) Started`;
	trace(msg);
	logInfo(msg);

} catch (err) {
	trace(err.message);
	logInfo(err);
}
