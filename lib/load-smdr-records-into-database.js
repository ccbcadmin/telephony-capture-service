#!/usr/bin/env node
"use strict";
var constants_1 = require('./constants');
var queue_1 = require('./share/queue');
var moment = require('moment');
var _ = require('lodash');
var pgp = require('pg-promise')();
var LoadSmdrRecordsIntoDatabase;
(function (LoadSmdrRecordsIntoDatabase) {
    ;
    var connection = {
        host: '192.168.99.100',
        port: 32774,
        database: 'postgres',
        user: 'postgres',
        password: ''
    };
    var db = pgp(connection);
    var insertCallRecords = function (smdrRecord) {
        return db.none("INSERT INTO RAW_CALL2 (\n\t\t\t\t\tCALL_TIME, \n\t\t\t\t\tCONNECTED_TIME,\n\t\t\t\t\tRING_TIME,\n\t\t\t\t\tCALLER,\n\t\t\t\t\tDIRECTION,\n\t\t\t\t\tCALLED_NUMBER,\n\t\t\t\t\tDIALED_NUMBER,\n\t\t\t\t\tIS_INTERNAL,\n\t\t\t\t\tCALL_ID,\n\t\t\t\t\tCONTINUATION,\n\t\t\t\t\tPARTY_1_DEVICE,\n\t\t\t\t\tPARTY_1_NAME,\n\t\t\t\t\tPARTY_2_DEVICE,\n\t\t\t\t\tPARTY_2_NAME,\n\t\t\t\t\tHOLD_TIME,\n\t\t\t\t\tPARK_TIME,\n\t\t\t\t\tEXTERNAL_TARGETING_CAUSE,\n\t\t\t\t\tEXTERNAL_TARGETER_ID,\n\t\t\t\t\tEXTERNAL_TARGETED_NUMBER)\n    \t\t\tVALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)", [
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
    };
    var routineName = 'Load SMDR Records Into Database';
    var HOST = '127.0.0.1';
    console.log(routineName + ": Started");
    process.on('SIGTERM', function () {
        console.log(routineName + ": Terminated");
        process.exit(0);
    });
    var badRawRecords = 0;
    var dataSink = function (msg) {
        console.log('database: ', msg.content.toString());
        var raw_call = msg.content.toString().split(',');
        if (raw_call.length !== 30) {
            ++badRawRecords;
        }
        else {
            console.log('==========');
            var callStart = raw_call[0];
            console.log('Call Start: ', callStart);
            var temp = raw_call[1].split(':');
            var connectedTime = String(Number(temp[0]) * 60 * 60 +
                Number(temp[1]) * 60 +
                Number(temp[2]));
            console.log('Connected Time (seconds): ', connectedTime);
            var ringTime = raw_call[2];
            var caller = raw_call[3];
            console.log('Caller: ', caller);
            var direction = raw_call[4];
            console.log('Direction: ', direction);
            var calledNumber = raw_call[5];
            console.log('Called Number: ', calledNumber);
            var dialedNumber = raw_call[6];
            console.log('Dialed Number: ', dialedNumber);
            var isInternal = raw_call[8];
            console.log('Is Internal: ', isInternal);
            var callId = raw_call[9];
            console.log('Call ID: ', callId);
            var continuation = raw_call[10];
            console.log('Continuation: ', continuation);
            var party1Device = raw_call[11];
            console.log('Party 1 Device: ', party1Device);
            var party1Name = raw_call[12];
            console.log('Party 1 Name: ', party1Name);
            var party2Device = raw_call[13];
            console.log('Party 2 Device: ', party2Device);
            var party2Name = raw_call[14];
            console.log('Party 2 Name: ', party2Name);
            var holdTime = raw_call[15];
            console.log('Hold Time: ', holdTime);
            var parkTime = raw_call[16];
            console.log('Park Time: ', parkTime);
            var externalTargetingCause = raw_call[27];
            console.log('External Targetting Cause: ', externalTargetingCause);
            var externalTargeterId = raw_call[28];
            console.log('External TargeterId: ', externalTargeterId);
            var externalTargetedNumber = raw_call[29];
            console.log('External Targeted Number: ', externalTargetedNumber);
            var smdrRecord = {
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
                .then(function () { _.noop; })
                .catch(function (err) { console.log('err: ', err); process.exit(); });
        }
        return true;
    };
    var smdrQueue = new queue_1.Queue(constants_1.DATABASE_QUEUE, dataSink);
})(LoadSmdrRecordsIntoDatabase = exports.LoadSmdrRecordsIntoDatabase || (exports.LoadSmdrRecordsIntoDatabase = {}));
