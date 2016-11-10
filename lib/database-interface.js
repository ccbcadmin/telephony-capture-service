#!/usr/bin/env node
"use strict";
const constants_1 = require('./share/constants');
const queue_1 = require('./share/queue');
var DatabaseInterface;
(function (DatabaseInterface) {
    const moment = require('moment');
    const _ = require('lodash');
    const pgp = require('pg-promise')();
    const envalid = require('envalid');
    const { str, num } = envalid;
    const env = envalid.cleanEnv(process.env, {
        DOCKER_MACHINE_IP: str(),
        STARTUP_DELAY: num()
    });
    const routineName = 'database-interface';
    let databaseQueue;
    ;
    let connection = {
        host: env.DOCKER_MACHINE_IP,
        port: 5672,
        database: 'postgres',
        user: 'postgres',
        password: ''
    };
    let db;
    const insertCallRecords = (smdrRecord) => db.none(`INSERT INTO RAW_CALL2 (
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
    console.log(`${routineName}: Started`);
    process.on('SIGTERM', () => {
        console.log(`${routineName}: Terminated`);
        process.exit(0);
    });
    let badRawRecords = 0;
    const dataSink = (msg) => {
        let raw_call = msg.content.toString().split(',');
        if (raw_call.length !== 30) {
            ++badRawRecords;
        }
        else {
            console.log('==========');
            let callStart = raw_call[0];
            let temp = raw_call[1].split(':');
            let connectedTime = String(Number(temp[0]) * 60 * 60 +
                Number(temp[1]) * 60 +
                Number(temp[2]));
            let ringTime = raw_call[2];
            let caller = raw_call[3];
            let direction = raw_call[4];
            let calledNumber = raw_call[5];
            let dialedNumber = raw_call[6];
            let isInternal = raw_call[8];
            let callId = raw_call[9];
            let continuation = raw_call[10];
            let party1Device = raw_call[11];
            let party1Name = raw_call[12];
            let party2Device = raw_call[13];
            let party2Name = raw_call[14];
            let holdTime = raw_call[15];
            let parkTime = raw_call[16];
            let externalTargetingCause = raw_call[27];
            let externalTargeterId = raw_call[28];
            let externalTargetedNumber = raw_call[29];
            let smdrRecord = {
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
                .then(() => {
                console.log('stored to database success');
                return true;
            })
                .catch(err => {
                console.log('err: ', err);
                return false;
            });
        }
        return true;
    };
    setTimeout(() => {
        db = pgp(connection);
        databaseQueue = new queue_1.Queue(constants_1.DATABASE_QUEUE, dataSink);
    }, env.STARTUP_DELAY);
})(DatabaseInterface = exports.DatabaseInterface || (exports.DatabaseInterface = {}));
