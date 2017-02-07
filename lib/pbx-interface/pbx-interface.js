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
let pbxSocket;
process.on('SIGTERM', () => {
    pbxSocket.close();
    console.log('TCS Terminated (SIGTERM)');
});
process.on('SIGINT', () => {
    pbxSocket.close();
    console.log('TCS Terminated (SIGINT)');
});
let tmsQueue;
let databaseQueue;
let leftOver = Buffer.alloc(0);
const processSmdrMessages = (data) => {
    let unprocessedData = Buffer.concat([leftOver, data], leftOver.length + data.length);
    const crLfIndexOf = unprocessedData.indexOf($.CRLF);
    if (crLfIndexOf < 0) {
        leftOver = Buffer.alloc(unprocessedData.length);
        unprocessedData.copy(leftOver);
    }
    else {
        const smdrMessage = unprocessedData.slice(0, crLfIndexOf + 2);
        databaseQueue.sendToQueue(smdrMessage);
        const saveFileName = '/smdr-data-001/rw' + moment().format('YYMMDD') + '.001';
        fs.appendFile(saveFileName, smdrMessage, (err) => {
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
const pbxLinkClosed = () => {
    console.log('PBX Link Closed');
    process.exit(0);
};
const queueDisconnectHandler = () => {
    pbxSocket.close();
};
tmsQueue = env.TMS_ACTIVE ? new queue_1.Queue(env.TMS_QUEUE, null, null, queueDisconnectHandler) : null;
databaseQueue = new queue_1.Queue(env.DB_QUEUE, null, null, queueDisconnectHandler);
pbxSocket = new server_socket_1.ServerSocket(routineName, env.TCS_PORT, dataSink, pbxLinkClosed);
