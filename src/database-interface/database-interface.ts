#!/usr/bin/env node
// tslint:disable: indent

import { Queue } from "../share/queue";
import {
	debugTcs,
	logInfo,
	logFatal,
	logError,
	Process,
} from "../Barrel";
import { Message } from "amqplib";
import { setTimeoutPromise } from '../Barrel/index';

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;

const pgp = require("pg-promise")();

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

class DatabaseInterface extends Process {

	private badRawRecords = 0;
	private env = envalid.cleanEnv(process.env, {
		DATABASE: str(),
		DB_QUEUE: str(),
	});

	private connection = {
		host: "localhost",
		port: 5432,
		database: this.env.DATABASE,
		user: "postgres"
	};	

	private db = pgp(this.connection);

	constructor() {

		super ({routineName: "database-interface"});

		new Queue({ queueName: this.env.DB_QUEUE, consumer: this.dataSink });
	}

	private insertCallRecords = async (smdrRecord: SmdrRecord): Promise<void> => {

		try {
			debugTcs({ smdrRecord });

			await this.db.none(`INSERT INTO SMDR (
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


		} catch (err) {
			debugTcs({ err });
			return Promise.reject(err);
		}
	}

	private dataSink = async (msg: Message): Promise<boolean> => {

		try {
			const raw_call = msg.content.toString().split(",");

			if (raw_call.length !== 30) {

				const log =
					`Bad SMDR Record Length: ${raw_call.length}, ` +
					`Bad SMDR Records: ${++this.badRawRecords}`;

				/*
				if (raw_call.length > 30) {
					console.log({ raw_call });
					process.exit(0);
				}
				*/

				logError(log);
				++this.badRawRecords;
				return true;

			} else {

				const callStart = raw_call[0];

				// Record Connected Time in seconds
				const temp: string[] = raw_call[1].split(":");
				const connectedTime = String(
					Number(temp[0]) * 60 * 60 +
					Number(temp[1]) * 60 +
					Number(temp[2]));
				debugTcs("Connected Time (seconds): ", connectedTime);

				// Ring Time in seconds
				const ringTime = raw_call[2];

				const caller = raw_call[3];
				// debugTcs('Caller: ', caller);

				const direction = raw_call[4];
				// debugTcs('Direction: ', direction);

				const calledNumber = raw_call[5];
				// debugTcs('Called Number: ', calledNumber);

				const dialedNumber = raw_call[6];
				// debugTcs('Dialed Number: ', dialedNumber);

				const isInternal = raw_call[8];
				// debugTcs('Is Internal: ', isInternal);

				const callId = raw_call[9];
				// debugTcs('Call ID: ', callId);

				const continuation = raw_call[10];
				// debugTcs('Continuation: ', continuation);

				const party1Device = raw_call[11];
				// debugTcs('Party 1 Device: ', party1Device);

				const party1Name = raw_call[12];
				// debugTcs('Party 1 Name: ', party1Name);

				const party2Device = raw_call[13];
				// debugTcs('Party 2 Device: ', party2Device);

				const party2Name = raw_call[14];
				// debugTcs('Party 2 Name: ', party2Name);

				const holdTime = raw_call[15];
				// debugTcs('Hold Time: ', holdTime);

				const parkTime = raw_call[16];
				// debugTcs('Park Time: ', parkTime);

				const externalTargetingCause = raw_call[27];
				// debugTcs('External Targetting Cause: ', externalTargetingCause);

				const externalTargeterId = raw_call[28];
				// debugTcs('External TargeterId: ', externalTargeterId);

				const externalTargetedNumber = raw_call[29];
				// debugTcs('External Targeted Number: ', externalTargetedNumber);

				const smdrRecord: SmdrRecord = {
					callStart,
					connectedTime,
					ringTime,
					caller,
					direction,
					calledNumber,
					dialedNumber,
					isInternal,
					callId,
					continuation,
					party1Device,
					party1Name,
					party2Device,
					party2Name,
					holdTime,
					parkTime,
					externalTargetingCause,
					externalTargeterId,
					externalTargetedNumber,
				};

				debugTcs("Before Insert");
				await this.insertCallRecords(smdrRecord);
				debugTcs("After Insert");
				return true;
			}

		} catch (err) {
			logError("Database Insert Failure: ", err);
			process.exit(1);
			return true;
		}
	}
}

try {

	new DatabaseInterface();

} catch (err) {
	debugTcs(err.message);
	logInfo(err);
}
