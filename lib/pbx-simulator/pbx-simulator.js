"use strict";
require('rxjs/add/operator/map');
const $ = require('../share/constants');
const client_socket_1 = require('../share/client-socket');
const routineName = 'pbx-simulator';
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
    PBX_SIMULATOR_SOURCE_DIRECTORY: str()
});
let smdrFiles = [];
let smdrFileNo = 0;
const tscSocket = new client_socket_1.ClientSocket('TCSSIM<=>TCS', 'localhost', env.TCS_PORT);
const sendSmdrRecords = (smdrFileName) => {
    let data = fs.readFileSync(smdrFileName).toString();
    process.stdout.write('Sending ' + smdrFileName + '  ');
    let index = 0;
    let next_index = 0;
    let recordCount = 0;
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
            if (!tscSocket.write($.SMDR_PREAMBLE) || !tscSocket.write(firstPart) || !tscSocket.write(secondPart)) {
                console.log('Link to TCS unavailable...aborting.');
                process.exit(-1);
            }
        }
    }, 5);
};
const nextFile = () => {
    if (smdrFileNo === smdrFiles.length) {
        process.exit(0);
    }
    else {
        sendSmdrRecords(smdrFiles[smdrFileNo]);
        ++smdrFileNo;
    }
};
ee.on('next', nextFile);
console.log('source: ', env.PBX_SIMULATOR_SOURCE_DIRECTORY);
dir.files(env.PBX_SIMULATOR_SOURCE_DIRECTORY, (err, files) => {
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
