#!/usr/bin/env node
"use strict";
require('rxjs/add/operator/map');
const $ = require('../share/constants');
const client_socket_1 = require('../share/client-socket');
const queue_1 = require('../share/queue');
const routineName = 'pbx-simulator';
const pgp = require('pg-promise')();
const _ = require('lodash');
const net = require('net');
const fs = require('fs');
const dir = require('node-dir');
const eventEmitter = require('events').EventEmitter;
const ee = new eventEmitter;
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TCS_PORT: num(),
    DATABASE: str(),
    DB_QUEUE: str()
});
let smdrFiles = [];
let smdrFileNo = 0;
let recordCount = 0;
const tcsSocket = new client_socket_1.ClientSocket('PBX->TCS', 'localhost', env.TCS_PORT);
const sendSmdrRecords = (smdrFileName) => {
    let data = fs.readFileSync(smdrFileName);
    process.stdout.write('Sending ' + smdrFileName + '  ');
    let index = 0;
    let next_index = 0;
    const intervalId = setInterval(() => {
        if ((next_index = data.indexOf($.CRLF, index)) < 0) {
            process.stdout.write(`\bis complete.  ${recordCount} SMDR records sent.\r\n`);
            clearInterval(intervalId);
            ee.emit('next');
        }
        else {
            ++recordCount;
            const nextMsg = data.slice(index, next_index + 2);
            if (recordCount % 20 === 5)
                process.stdout.write('\b-');
            else if (recordCount % 20 === 10)
                process.stdout.write('\b\\');
            else if (recordCount % 20 === 15)
                process.stdout.write('\b|');
            else if (recordCount % 20 === 0)
                process.stdout.write('\b/');
            index = next_index + 2;
            const partition = Math.floor(Math.random() * nextMsg.length);
            const firstPart = nextMsg.slice(0, partition);
            const secondPart = nextMsg.slice(partition);
            if (!tcsSocket.write(firstPart) || !tcsSocket.write(secondPart)) {
                console.log('Link to TCS unavailable...aborting.');
                process.exit(-1);
            }
        }
    }, 2);
};
const connection = {
    host: 'localhost',
    port: 5432,
    database: env.DATABASE,
    user: 'postgres'
};
const db = pgp(connection);
const checkRecordCount = () => {
    console.log('Record Count: ', recordCount);
    let result;
    db.query.one('select count(*) from smdr;', result);
    console.log('Result is: ', result);
    process.exit(0);
};
const nextFile = () => {
    if (smdrFileNo === smdrFiles.length) {
        setTimeout(checkRecordCount, 3000);
    }
    else {
        sendSmdrRecords(smdrFiles[smdrFileNo]);
        ++smdrFileNo;
    }
};
ee.on('next', nextFile);
console.log('Clear DB_QUEUE');
const databaseQueue = new queue_1.Queue(env.DB_QUEUE, () => true);
setTimeout(() => {
    databaseQueue.close();
    dir.files('./sample-data/smdr-data/smdr-one-file', (err, files) => {
        if (err)
            throw err;
        files.sort();
        for (let file of files) {
            let path = file.split('\\');
            if (path[path.length - 1].match($.REGEXP_SMDR_FILENAME)) {
                smdrFiles.push(file);
            }
        }
        nextFile();
    });
}, 2000);
