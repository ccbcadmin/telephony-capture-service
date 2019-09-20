#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../share/constants");
const client_socket_1 = require("../share/client-socket");
const queue_1 = require("../share/queue");
const util_1 = require("../share/util");
const Barrel_1 = require("../Barrel");
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
        if ((next_index = data.indexOf(constants_1.CRLF, index)) < 0) {
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
                Barrel_1.trace("Link to TCS unavailable...aborting.");
                process.exit(1);
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
        .then((response) => {
        Barrel_1.trace(response.count);
        if (response.count == smdrMsgsSent) {
            Barrel_1.trace(`Passed: ${smdrMsgsSent} messages sent and received`);
            process.exit(0);
        }
        else {
            Barrel_1.trace(`Failed: ${smdrMsgsSent} messages sent and ${response.count} received`);
            process.exit(1);
        }
    })
        .catch((error) => {
        Barrel_1.trace("Postgres query failed: ", JSON.stringify(error));
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
const sendData = () => {
    dir.files("./sample-data/smdr-data/smdr-one-file", (err, files) => {
        if (err)
            throw err;
        files.sort();
        for (let file of files) {
            let path = file.split("/");
            if (path[path.length - 1].match(constants_1.REGEXP_SMDR_FILENAME)) {
                smdrFiles.push(file);
            }
        }
        nextFile();
    });
};
const databaseQueue = new queue_1.Queue(env.DB_QUEUE);
util_1.sleep(2000)
    .then(databaseQueue.purge)
    .then(() => db.none("delete from smdr;"))
    .then(() => client_socket_1.createClient("pbx=>tcs", "localhost", env.TCS_PORT, sendData))
    .then((client) => tcsClient = client)
    .catch(error => { Barrel_1.trace(JSON.stringify(error, null, 4)); process.exit(1); });
