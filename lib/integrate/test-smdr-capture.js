#!/usr/bin/env node
"use strict";
const $ = require("../share/constants");
const client_socket_1 = require("../share/client-socket");
const queue_1 = require("../share/queue");
const util_1 = require("../share/util");
const routineName = "pbx-simulator";
const pgp = require("pg-promise")();
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
    TEST_TRANSMIT_INTERVAL: num(),
    DATABASE: str(),
    DB_QUEUE: str()
});
let smdrFiles = [];
let smdrFileNo = 0;
let smdrMsgsSent = 0;
let tcsClient;
const sendSmdrRecords = (smdrFileName) => {
    let data = fs.readFileSync(smdrFileName);
    process.stdout.write("Sending " + smdrFileName + "  ");
    let index = 0;
    let next_index = 0;
    const intervalId = setInterval(() => {
        if ((next_index = data.indexOf($.CRLF, index)) < 0) {
            process.stdout.write(`\bis complete.  ${smdrMsgsSent} SMDR records sent.\r\n`);
            clearInterval(intervalId);
            ee.emit("next");
        }
        else {
            ++smdrMsgsSent;
            const nextMsg = data.slice(index, next_index + 2);
            index = next_index + 2;
            const partition = Math.floor(Math.random() * nextMsg.length);
            const firstPart = nextMsg.slice(0, partition);
            const secondPart = nextMsg.slice(partition);
            if (!tcsClient.write(firstPart) || !tcsClient.write(secondPart)) {
                console.log("Link to TCS unavailable...aborting.");
                process.exit(-1);
            }
        }
    }, env.TEST_TRANSMIT_INTERVAL);
};
const connection = {
    host: "localhost",
    port: 5432,
    database: env.DATABASE,
    user: "postgres"
};
const db = pgp(connection);
const checkRecordCount = () => {
    db.one("select count(*) from smdr;")
        .then(response => {
        console.log(response.count);
        if (response.count == smdrMsgsSent) {
            console.log(`Passed: ${smdrMsgsSent} messages sent and received`);
            process.exit(0);
        }
        else {
            console.log(`Failed: ${smdrMsgsSent} messages sent and ${response.count} received`);
            process.exit(1);
        }
    })
        .catch(error => {
        console.log("Postgres query failed: ", JSON.stringify(error));
        process.exit(1);
    });
};
const nextFile = () => {
    if (smdrFileNo === smdrFiles.length) {
        util_1.sleep(10000).then(checkRecordCount);
    }
    else {
        sendSmdrRecords(smdrFiles[smdrFileNo]);
        ++smdrFileNo;
    }
};
ee.on("next", nextFile);
db.none("delete from smdr;")
    .then(() => _.noop)
    .catch(error => {
    console.log("database purge error: ", JSON.stringify(error));
    process.exit(1);
});
const sendData = () => {
    dir.files("./sample-data/smdr-data/smdr-one-file", (err, files) => {
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
const databaseQueue = new queue_1.Queue(env.DB_QUEUE, null, null, null);
util_1.sleep(2000)
    .then(databaseQueue.purge)
    .then(() => tcsClient = new client_socket_1.ClientSocket("PBX->TCS", "localhost", env.TCS_PORT, sendData));
