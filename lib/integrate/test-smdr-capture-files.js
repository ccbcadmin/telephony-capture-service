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
const constants_1 = require("../share/constants");
const client_socket_1 = require("../share/client-socket");
const util_1 = require("../share/util");
const fs_1 = __importDefault(require("fs"));
const node_dir_1 = __importDefault(require("node-dir"));
const net = require("net");
const events_1 = require("events");
const ee = new events_1.EventEmitter();
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
        if ((next_index = data.indexOf(constants_1.CRLF, index)) < 0) {
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
const compareFiles = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Compare Files");
        const files = yield node_dir_1.default.promiseFiles("/smdr-data/smdr-data-001");
        if (files.length !== 1) {
            console.log("Exactly One SMDR-DATA-001 file expected");
            process.exit(1);
        }
        console.log("filename: ", files[0]);
        const data = yield fs_1.default.promises.readFile(files[0]);
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
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }
});
const nextFile = () => __awaiter(void 0, void 0, void 0, function* () {
    if (smdrFileNo === smdrFiles.length) {
        yield util_1.sleep(1000);
        yield compareFiles();
    }
    else {
        console.log("Sending: " + smdrFiles[smdrFileNo]);
        txBuffer = fs_1.default.readFileSync(smdrFiles[smdrFileNo]);
        sendSmdrRecords(txBuffer, env.TEST_TRANSMIT_INTERVAL);
        ++smdrFileNo;
    }
});
ee.on("next", nextFile);
const clearSMDR_DATA_001 = () => new Promise((resolve, reject) => {
    node_dir_1.default.files("/smdr-data/smdr-data-001", (error, files) => {
        if (error) {
            console.log(JSON.stringify(error, null, 4));
            return reject(error);
        }
        files.forEach(file => {
            fs_1.default.unlink(file, (error) => {
                if (error) {
                    console.log(JSON.stringify(error, null, 4));
                    process.exit(1);
                }
            });
        });
        resolve();
    });
});
const sendData = () => {
    node_dir_1.default.files("./sample-data/smdr-data/smdr-one-file", (error, files) => {
        if (error) {
            console.log(JSON.stringify(error, null, 4));
            process.exit(1);
        }
        else if (files.length !== 1) {
            console.log("Only one file expected");
            process.exit(1);
        }
        let path = files[0].split("/");
        if (path[path.length - 1].match(constants_1.REGEXP_SMDR_FILENAME)) {
            smdrFiles.push(files[0]);
        }
        else {
            console.log("Not an SMRD File");
            process.exit(1);
        }
        nextFile();
    });
};
util_1.sleep(4000)
    .then(clearSMDR_DATA_001)
    .then(() => client_socket_1.createClient("pbx=>tcs", "localhost", env.TCS_PORT, sendData))
    .then((client) => tcsClient = client)
    .catch((err) => { console.log("Err: ", JSON.stringify(err, null, 4)); });
