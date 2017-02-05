#!/usr/bin/env node
"use strict";
require('rxjs/add/operator/map');
const $ = require('../share/constants');
const client_socket_1 = require('../share/client-socket');
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
let smdrMsgsSent = 0;
const tcsSocket = new client_socket_1.ClientSocket('PBX->TCS', 'localhost', env.TCS_PORT);
const sendSmdrRecords = (smdrFileName) => {
    let data = fs.readFileSync(smdrFileName);
    process.stdout.write('Sending ' + smdrFileName + '  ');
    let index = 0;
    let next_index = 0;
    const intervalId = setInterval(() => {
        if ((next_index = data.indexOf($.CRLF, index)) < 0) {
            process.stdout.write(`\bis complete.  ${smdrMsgsSent} SMDR records sent.\r\n`);
            clearInterval(intervalId);
            ee.emit('next');
        }
        else {
            ++smdrMsgsSent;
            const nextMsg = data.slice(index, next_index + 2);
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
const compareFiles = () => {
    console.log('Compare Files');
    process.exit(0);
};
const nextFile = () => {
    if (smdrFileNo === smdrFiles.length) {
        setTimeout(compareFiles, 10000);
    }
    else {
        sendSmdrRecords(smdrFiles[smdrFileNo]);
        ++smdrFileNo;
    }
};
ee.on('next', nextFile);
dir.files('/smdr-data/smdr-data-001', (error, files) => {
    if (error)
        throw error;
    files.forEach(file => {
        fs.unlink(file, (error) => {
            throw error;
        });
    });
});
setTimeout(() => {
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
}, 5000);
