#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("../share/queue");
const Barrel_1 = require("../Barrel");
const envalid = require("envalid");
const { str, num } = envalid;
const pgp = require("pg-promise")();
class DatabaseInterface extends Barrel_1.Process {
    constructor() {
        super({ routineName: "database-interface" });
        this.badRawRecords = 0;
        this.env = envalid.cleanEnv(process.env, {
            DATABASE: str(),
            DB_QUEUE: str(),
        });
        this.connection = {
            host: "localhost",
            port: 5432,
            database: this.env.DATABASE,
            user: "postgres"
        };
        this.db = pgp(this.connection);
        this.insertCallRecords = (smdrRecord) => __awaiter(this, void 0, void 0, function* () {
            try {
                Barrel_1.debugTcs({ smdrRecord });
                yield this.db.none(`INSERT INTO SMDR (
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
    			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`, [
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
            }
            catch (err) {
                Barrel_1.debugTcs({ err });
                return Promise.reject(err);
            }
        });
        this.dataSink = (msg) => __awaiter(this, void 0, void 0, function* () {
            try {
                const raw_call = msg.content.toString().split(",");
                if (raw_call.length !== 30) {
                    const log = `Bad SMDR Record Length: ${raw_call.length}, ` +
                        `Bad SMDR Records: ${++this.badRawRecords}`;
                    Barrel_1.logError(log);
                    ++this.badRawRecords;
                    return true;
                }
                else {
                    const callStart = raw_call[0];
                    const temp = raw_call[1].split(":");
                    const connectedTime = String(Number(temp[0]) * 60 * 60 +
                        Number(temp[1]) * 60 +
                        Number(temp[2]));
                    Barrel_1.debugTcs("Connected Time (seconds): ", connectedTime);
                    const ringTime = raw_call[2];
                    const caller = raw_call[3];
                    const direction = raw_call[4];
                    const calledNumber = raw_call[5];
                    const dialedNumber = raw_call[6];
                    const isInternal = raw_call[8];
                    const callId = raw_call[9];
                    const continuation = raw_call[10];
                    const party1Device = raw_call[11];
                    const party1Name = raw_call[12];
                    const party2Device = raw_call[13];
                    const party2Name = raw_call[14];
                    const holdTime = raw_call[15];
                    const parkTime = raw_call[16];
                    const externalTargetingCause = raw_call[27];
                    const externalTargeterId = raw_call[28];
                    const externalTargetedNumber = raw_call[29];
                    const smdrRecord = {
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
                    Barrel_1.debugTcs("Before Insert");
                    yield this.insertCallRecords(smdrRecord);
                    Barrel_1.debugTcs("After Insert");
                    return true;
                }
            }
            catch (err) {
                Barrel_1.logError("Database Insert Failure: ", err);
                process.exit(1);
                return true;
            }
        });
        new queue_1.Queue({ queueName: this.env.DB_QUEUE, consumer: this.dataSink });
    }
}
try {
    new DatabaseInterface();
}
catch (err) {
    Barrel_1.debugTcs(err.message);
    Barrel_1.logInfo(err);
}
