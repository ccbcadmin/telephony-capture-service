"use strict";
const constants_1 = require('./share/constants');
const client_socket_1 = require('./share/client-socket');
const utility_1 = require('./share/utility');
var TelephonySimulator;
(function (TelephonySimulator) {
    const routineName = 'telephony-simulator';
    const _ = require('lodash');
    const net = require('net');
    const fs = require('fs');
    const dir = require('node-dir');
    const eventEmitter = require('events').EventEmitter;
    const ee = new eventEmitter;
    let smdrFiles = [];
    let smdrFileNo = 0;
    if (process.argv.length !== 5) {
        console.log(`Usage: node lib/${routineName} SourceDirectory HostIpAddress Port`);
        process.exit(0);
    }
    else if (!net.isIP(process.argv[3])) {
        console.log(`telephony-simulator: ${process.argv[3]}, Invalid IP Address`);
        process.exit(0);
    }
    else if (!process.argv[4].match(/^\d+$/)) {
        console.log(`telephony-simulator: ${process.argv[4]}, Invalid Port`);
        process.exit(0);
    }
    const tscSocket = new client_socket_1.ClientSocket('TCSSIM<=>TCS', process.argv[3], Number(process.argv[4]));
    const sendSmdrRecords = (smdrFileName) => {
        let data = fs.readFileSync(smdrFileName).toString();
        process.stdout.write('Sending ' + smdrFileName + '  ');
        let index = 0;
        let next_index = 0;
        let recordCount = 0;
        const intervalId = setInterval(() => {
            if ((next_index = data.indexOf(constants_1.CRLF, index)) < 0) {
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
                if (!tscSocket.write(constants_1.SMDR_PREAMBLE) || !tscSocket.write(firstPart) || !tscSocket.write(secondPart)) {
                    console.log('Link to TCS Shutdown');
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
    dir.files(process.argv[2] ? process.argv[2] : '.', (err, files) => {
        if (err)
            throw err;
        files.sort();
        for (let file of files) {
            let path = file.split('\\');
            if (path[path.length - 1].match(utility_1.regExpSmdrFileName)) {
                smdrFiles.push(file);
            }
        }
        nextFile();
    });
})(TelephonySimulator = exports.TelephonySimulator || (exports.TelephonySimulator = {}));
