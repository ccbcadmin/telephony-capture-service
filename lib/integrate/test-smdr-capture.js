#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const fs_1 = __importDefault(require("fs"));
const node_dir_1 = __importDefault(require("node-dir"));
const constants_1 = require("../share/constants");
const client_socket_1 = require("../share/client-socket");
const queue_1 = require("../share/queue");
const util_1 = require("../share/util");
const Barrel_1 = require("../Barrel");
const pgp = require("pg-promise")();
const net = require("net");
const ee = new events_1.EventEmitter();
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
const sendSmdrRecords = (smdrFileName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield fs_1.default.promises.readFile(smdrFileName);
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
                    Barrel_1.debugTcs("Link to TCS unavailable...aborting.");
                    process.exit(1);
                }
            }
        }, env.TEST_TRANSMIT_INTERVAL);
    }
    catch (err) {
        Barrel_1.debugTcs(err);
    }
});
const connection = {
    host: "localhost",
    port: 5432,
    database: env.DATABASE,
    user: "postgres"
};
const db = pgp(connection);
const checkRecordCount = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield db.one("select count(*) from smdr;");
        Barrel_1.debugTcs(response.count);
        if (response.count === smdrMsgsSent) {
            Barrel_1.debugTcs(`Passed: ${smdrMsgsSent} messages sent and received`);
            process.exit(0);
        }
        else {
            Barrel_1.debugTcs(`Failed: ${smdrMsgsSent} messages sent and ${response.count} received`);
            process.exit(1);
        }
    }
    catch (err) {
        Barrel_1.debugTcs("Postgres query failed: ", err);
        process.exit(1);
    }
});
const nextFile = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (smdrFileNo === smdrFiles.length) {
            yield util_1.sleep(10000);
            yield checkRecordCount();
        }
        else {
            sendSmdrRecords(smdrFiles[smdrFileNo]);
            ++smdrFileNo;
        }
    }
    catch (err) {
        Barrel_1.debugTcs(err);
        process.exit(1);
    }
});
ee.on("next", nextFile);
const sendData = () => __awaiter(void 0, void 0, void 0, function* () {
    const files = yield node_dir_1.default.promiseFiles("./sample-data/smdr-data/smdr-one-file");
    files.sort();
    for (let file of files) {
        let path = file.split("/");
        if (path[path.length - 1].match(constants_1.REGEXP_SMDR_FILENAME)) {
            smdrFiles.push(file);
        }
    }
    yield nextFile();
});
const databaseQueue = new queue_1.Queue(env.DB_QUEUE);
util_1.sleep(2000)
    .then(databaseQueue.purge)
    .then(() => db.none("delete from smdr;"))
    .then(() => client_socket_1.createClient("pbx=>tcs", "localhost", env.TCS_PORT, sendData))
    .then((client) => tcsClient = client)
    .catch(error => { Barrel_1.debugTcs(JSON.stringify(error, null, 4)); process.exit(1); });
