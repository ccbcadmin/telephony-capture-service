#!/usr/bin/env node
"use strict";
const $ = require("../share/constants");
const client_socket_1 = require("../share/client-socket");
const routineName = "pbx-simulator";
const pgp = require("pg-promise")();
const _ = require("lodash");
const net = require("net");
const fs = require("fs");
const dir = require("node-dir");
const eventEmitter = require("events").EventEmitter;
const ee = new eventEmitter;
const path = require("path");
const testName = path.basename(__filename).split(".")[0];
console.log(`\nTest Case: ${testName}`);
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TCS_PORT: num(),
    TEST_TRANSMIT_INTERVAL: num(),
    DATABASE: str(),
});
let smdrFiles = [];
let smdrFileNo = 0;
let tcsClient;
let txBuffer = Buffer.alloc(0);
let rxBuffer = Buffer.alloc(0);
let txMsgCount = 0;
let rxMsgCount = 0;
const sendSmdrRecords = (data, transmitInterval) => {
    let index = 0;
    let next_index = 0;
    const intervalId = setInterval(() => {
        if ((next_index = data.indexOf($.CRLF, index)) < 0) {
            process.stdout.write(`\bis complete.  ${txMsgCount} SMDR records sent.\r\n`);
            clearInterval(intervalId);
            ee.emit("next");
        }
        else {
            ++txMsgCount;
            const nextMsg = data.slice(index, next_index + 2);
            index = next_index + 2;
            const partition = Math.floor(Math.random() * nextMsg.length);
            const firstPart = nextMsg.slice(0, partition);
            const secondPart = nextMsg.slice(partition);
            if (!tcsClient.write(firstPart) || !tcsClient.write(secondPart)) {
                console.log("pbx=>tcs: Unavailable");
                process.exit(1);
            }
        }
    }, transmitInterval);
};
const compareFiles = () => {
    console.log("Compare Files");
    dir.files("/smdr-data/smdr-data-001", (error, files) => {
        if (error) {
            console.log(JSON.stringify(error, null, 4));
            process.exit(1);
        }
        else if (files.length !== 1) {
            console.log("Only One SMDR-DATA-001 file expected");
            process.exit(1);
        }
        console.log("filename: ", files[0]);
        fs.readFile(files[0], (error, data) => {
            if (error) {
                console.log(JSON.stringify(error, null, 4));
                process.exit(1);
            }
            console.log("Length of data: ", data.length);
            rxBuffer = Buffer.concat([rxBuffer, data], rxBuffer.length + data.length);
            console.log("result: ", txBuffer.length, rxBuffer.length);
            if (Buffer.compare(txBuffer, rxBuffer) === 0) {
                console.log("Source Files and Target Files are identical");
                process.exit(0);
            }
            else {
                console.log("Source Files and Target Files differ");
                for (let i = 0; i < rxBuffer.length; ++i) {
                    if (rxBuffer[i] === 10) {
                        ++rxMsgCount;
                    }
                }
                if (rxMsgCount === txMsgCount) {
                    console.log("Msg Counts are Identical", txMsgCount, rxMsgCount);
                }
                else {
                    console.log("Msg Counts are Not Identical", txMsgCount, rxMsgCount);
                }
                process.exit(1);
            }
        });
    });
};
const nextFile = () => {
    if (smdrFileNo === smdrFiles.length) {
        setTimeout(compareFiles, 10000);
    }
    else {
        console.log("Sending: " + smdrFiles[smdrFileNo]);
        txBuffer = fs.readFileSync(smdrFiles[smdrFileNo]);
        sendSmdrRecords(txBuffer, env.TEST_TRANSMIT_INTERVAL);
        ++smdrFileNo;
    }
};
ee.on("next", nextFile);
dir.files("/smdr-data/smdr-data-001", (error, files) => {
    if (error) {
        console.log(JSON.stringify(error, null, 4));
        process.exit(1);
    }
    files.forEach(file => {
        fs.unlink(file, (error) => {
            if (error) {
                console.log(JSON.stringify(error, null, 4));
                process.exit(1);
            }
        });
    });
});
const sendData = () => {
    dir.files("./sample-data/smdr-data/smdr-one-file", (error, files) => {
        if (error) {
            console.log(JSON.stringify(error, null, 4));
            process.exit(1);
        }
        else if (files.length !== 1) {
            console.log("Only one file expected");
            process.exit(1);
        }
        let path = files[0].split("/");
        if (path[path.length - 1].match($.REGEXP_SMDR_FILENAME)) {
            smdrFiles.push(files[0]);
        }
        else {
            console.log("Not an SMRD File");
            process.exit(1);
        }
        nextFile();
    });
};
setTimeout(() => {
    tcsClient = new client_socket_1.ClientSocket("PBX->TCS", "localhost", env.TCS_PORT, sendData);
}, 4000);
