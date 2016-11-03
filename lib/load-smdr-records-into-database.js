#!/usr/bin/env node
"use strict";
const constants_1 = require('./constants');
const queue_1 = require('./share/queue');
const moment = require('moment');
const _ = require('lodash');
const pgp = require('pg-promise')();
var LoadSmdrRecordsIntoDatabase;
(function (LoadSmdrRecordsIntoDatabase) {
    ;
    let connection = {
        host: '192.168.99.100',
        port: 32774,
        database: 'postgres',
        user: 'postgres',
        password: ''
    };
    const db = pgp(connection);
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
    const routineName = 'Load SMDR Records Into Database';
    const HOST = '127.0.0.1';
    console.log(`${routineName}: Started`);
    process.on('SIGTERM', () => {
        console.log(`${routineName}: Terminated`);
        process.exit(0);
    });
    let badRawRecords = 0;
    const dataSink = (msg) => {
        console.log('database: ', msg.content.toString());
        let raw_call = msg.content.toString().split(',');
        if (raw_call.length !== 30) {
            ++badRawRecords;
        }
        else {
            console.log('==========');
            let callStart = raw_call[0];
            console.log('Call Start: ', callStart);
            let temp = raw_call[1].split(':');
            let connectedTime = String(Number(temp[0]) * 60 * 60 +
                Number(temp[1]) * 60 +
                Number(temp[2]));
            console.log('Connected Time (seconds): ', connectedTime);
            let ringTime = raw_call[2];
            let caller = raw_call[3];
            console.log('Caller: ', caller);
            let direction = raw_call[4];
            console.log('Direction: ', direction);
            let calledNumber = raw_call[5];
            console.log('Called Number: ', calledNumber);
            let dialedNumber = raw_call[6];
            console.log('Dialed Number: ', dialedNumber);
            let isInternal = raw_call[8];
            console.log('Is Internal: ', isInternal);
            let callId = raw_call[9];
            console.log('Call ID: ', callId);
            let continuation = raw_call[10];
            console.log('Continuation: ', continuation);
            let party1Device = raw_call[11];
            console.log('Party 1 Device: ', party1Device);
            let party1Name = raw_call[12];
            console.log('Party 1 Name: ', party1Name);
            let party2Device = raw_call[13];
            console.log('Party 2 Device: ', party2Device);
            let party2Name = raw_call[14];
            console.log('Party 2 Name: ', party2Name);
            let holdTime = raw_call[15];
            console.log('Hold Time: ', holdTime);
            let parkTime = raw_call[16];
            console.log('Park Time: ', parkTime);
            let externalTargetingCause = raw_call[27];
            console.log('External Targetting Cause: ', externalTargetingCause);
            let externalTargeterId = raw_call[28];
            console.log('External TargeterId: ', externalTargeterId);
            let externalTargetedNumber = raw_call[29];
            console.log('External Targeted Number: ', externalTargetedNumber);
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
                .then(() => { _.noop; })
                .catch(err => { console.log('err: ', err); process.exit(); });
        }
        return true;
    };
    const smdrQueue = new queue_1.Queue(constants_1.DATABASE_QUEUE, dataSink);
})(LoadSmdrRecordsIntoDatabase = exports.LoadSmdrRecordsIntoDatabase || (exports.LoadSmdrRecordsIntoDatabase = {}));
