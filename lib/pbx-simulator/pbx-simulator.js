#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("rxjs/add/operator/map");
const $ = require("../share/constants");
const client_socket_1 = require("../share/client-socket");
const routineName = "pbx-simulator";
const _ = require("lodash");
const net = require("net");
const fs = require("fs");
const dir = require("node-dir");
const eventEmitter = require("events").EventEmitter;
const ee = new eventEmitter;
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TCS_PORT: num(),
    PBX_SIMULATOR_SOURCE_DIRECTORY: str(),
    PBX_SIMULATOR_INPUT_FREQUENCY: num()
});
let smdrFiles = [];
let smdrFileNo = 0;
let tcsClient;
const sendSmdrRecords = (smdrFileName) => {
    let data = fs.readFileSync(smdrFileName);
    process.stdout.write("Sending " + smdrFileName + "  ");
    let index = 0;
    let next_index = 0;
    let recordCount = 0;
    const intervalId = setInterval(() => {
        if ((next_index = data.indexOf($.CRLF, index)) < 0) {
            process.stdout.write(`\bis complete.  ${recordCount} SMDR records sent.\r\n`);
            clearInterval(intervalId);
            ee.emit("next");
        }
        else {
            ++recordCount;
            const nextMsg = data.slice(index, next_index + 2);
            if (recordCount % 20 === 5)
                process.stdout.write("-");
            else if (recordCount % 20 === 10)
                process.stdout.write("\\");
            else if (recordCount % 20 === 15)
                process.stdout.write("|");
            else if (recordCount % 20 === 0)
                process.stdout.write("/");
            index = next_index + 2;
            const partition = Math.floor(Math.random() * nextMsg.length);
            const firstPart = nextMsg.slice(0, partition);
            const secondPart = nextMsg.slice(partition);
            if (!tcsClient.write(firstPart) || !tcsClient.write(secondPart)) {
                console.log("Link to TCS unavailable...aborting.");
                process.exit(1);
            }
        }
    }, env.PBX_SIMULATOR_INPUT_FREQUENCY);
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
ee.addListener("next", nextFile);
const sendData = () => {
    const sourceDir = `/smdr-data/${env.PBX_SIMULATOR_SOURCE_DIRECTORY}`;
    console.log("sourceDir: ", sourceDir);
    dir.files(sourceDir, (err, files) => {
        if (err)
            throw err;
        files.sort();
        for (let file of files) {
            let path = file.split("/");
            if (path[path.length - 1].match($.REGEXP_SMDR_FILENAME)) {
                smdrFiles.push(file);
            }
        }
        nextFile();
    });
};
tcsClient = new client_socket_1.ClientSocket("pbx=>tcs", "localhost", env.TCS_PORT, sendData);
