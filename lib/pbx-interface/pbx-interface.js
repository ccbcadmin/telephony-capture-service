#!/usr/bin/env node
"use strict";
const $ = require('../share/constants');
const server_socket_1 = require('../share/server-socket');
const queue_1 = require('../share/queue');
const moment = require('moment');
const fs = require('fs');
const routineName = 'pbx-interface';
console.log(`Restarting ${routineName}`);
const _ = require('lodash');
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TMS_ACTIVE: num(),
    TCS_PORT: num(),
    DB_QUEUE: str(),
    TMS_QUEUE: str()
});
process.on('SIGTERM', () => {
    console.log('Telephony Capture Service: Terminated');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
    process.exit(0);
});
let tmsQueue;
let databaseQueue;
let leftOver = Buffer.alloc(0);
const processSmdrMessages = (data) => {
    let unprocessedData = Buffer.concat([leftOver, data]);
    const crLfIndexOf = unprocessedData.indexOf($.CRLF);
    if (crLfIndexOf < 0) {
        leftOver = Buffer.alloc(unprocessedData.length);
        unprocessedData.copy(leftOver);
    }
    else {
        databaseQueue.sendToQueue(unprocessedData.slice(0, crLfIndexOf + 2));
        fs.appendFile('/smdr-data-001/rw000000.001', unprocessedData.slice(0, crLfIndexOf + 2), (err) => {
            if (err)
                throw err;
        });
        leftOver = Buffer.alloc(unprocessedData.length - (crLfIndexOf + 2));
        unprocessedData.copy(leftOver, 0, crLfIndexOf + 2);
    }
};
const dataSink = (data) => {
    env.TMS_ACTIVE ? tmsQueue.sendToQueue(data) : _.noop;
    processSmdrMessages(data);
};
tmsQueue = env.TMS_ACTIVE ? new queue_1.Queue(env.TMS_QUEUE) : null;
databaseQueue = new queue_1.Queue(env.DB_QUEUE);
new server_socket_1.ServerSocket(routineName, env.TCS_PORT, dataSink);
const timeToMonthEnd = () => moment().add(1, 'months').startOf('month').valueOf() - moment().valueOf();
const closeOffMonthlyFile = () => {
    console.log('Start of New Month');
    fs.stat('/smdr-data-001/rw000000.001', (error) => {
        const newFileName = 'rw' + moment().subtract(1, 'days').format('YYMMDD') + '.001';
        fs.rename('/smdr-data-001/rw000000.001', newFileName, function (err) {
            if (err)
                console.log('ERROR: ' + err);
        });
    });
    setTimeout(closeOffMonthlyFile, timeToMonthEnd());
};
setTimeout(closeOffMonthlyFile, timeToMonthEnd());
