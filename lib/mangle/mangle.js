#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../share/constants");
const Barrel_1 = require("../Barrel");
const fs_1 = __importDefault(require("fs"));
const node_dir_1 = __importDefault(require("node-dir"));
const routineName = "mangle";
const envalid = require("envalid");
const { str } = envalid;
const env = envalid.cleanEnv(process.env, {
    SOURCE_DIRECTORY: str(),
    TARGET_DIRECTORY: str()
});
const sourceDir = `/smdr-data/${env.SOURCE_DIRECTORY}`;
const targetDir = `/smdr-data/${env.TARGET_DIRECTORY}`;
const events_1 = require("events");
const ee = new events_1.EventEmitter();
const zeroPad = (num, places) => {
    const zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
};
let substitutePhoneNumberMap = new Map();
const substituteDummyPhoneNumber = (phoneNumber) => {
    if (phoneNumber.length === 10) {
        if (substitutePhoneNumberMap.has(phoneNumber)) {
            return substitutePhoneNumberMap.get(phoneNumber);
        }
        else {
            const substitutePhoneNumber = phoneNumber.slice(0, 6) + ("" + Math.random()).substring(2, 6);
            substitutePhoneNumberMap.set(phoneNumber, substitutePhoneNumber);
            return substitutePhoneNumber;
        }
    }
    else if ((phoneNumber.length === 11 && phoneNumber.slice(0, 1) === "1")) {
        if (substitutePhoneNumberMap.has(phoneNumber)) {
            return substitutePhoneNumberMap.get(phoneNumber);
        }
        else {
            const substitutePhoneNumber = phoneNumber.slice(0, 7) + ("" + Math.random()).substring(2, 6);
            substitutePhoneNumberMap.set(phoneNumber, substitutePhoneNumber);
            return substitutePhoneNumber;
        }
    }
    else {
        return phoneNumber;
    }
};
process.on("SIGTERM", () => {
    Barrel_1.debugTcs("Telephony Capture Service: Terminated");
    process.exit(Barrel_1.ExitCode.SIGTERM_Exit);
});
process.on("SIGINT", () => {
    Barrel_1.debugTcs("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
    process.exit(Barrel_1.ExitCode.SIGINT_Exit);
});
let smdrFiles = [];
let smdrFileNo = 0;
const replicateSmdrFile = (smdrFileName) => {
    const data = fs_1.default.readFileSync(smdrFileName).toString();
    let filePart = smdrFileName.split("/");
    const inputFileNameParts = filePart[filePart.length - 1].split(".");
    const outputFile = `${inputFileNameParts[0]}.${zeroPad(Number(inputFileNameParts[1]) + 1, 3)}`;
    const outputPath = [targetDir, outputFile].join("/");
    process.stdout.write(`Mangling ${smdrFileName} to ${outputPath}: `);
    const fd = fs_1.default.openSync(outputPath, "w");
    let recordCount = 0;
    let unknownRecords = 0;
    let index = 0;
    let next_index = 0;
    while ((next_index = data.indexOf(constants_1.CRLF, index)) > 0) {
        const smdrMessage = data.slice(index, next_index);
        index = next_index + 2;
        let raw_call = smdrMessage.split(",");
        if (raw_call.length !== 30) {
            ++unknownRecords;
        }
        else {
            ++recordCount;
            raw_call[3] = substituteDummyPhoneNumber(raw_call[3]);
            raw_call[5] = substituteDummyPhoneNumber(raw_call[5]);
            raw_call[6] = substituteDummyPhoneNumber(raw_call[6]);
            let testSmdr = raw_call.join(",") + constants_1.CRLF;
            fs_1.default.writeSync(fd, testSmdr);
        }
    }
    process.stdout.write("SMDR Records: " + recordCount + ", Unknown Records: " + unknownRecords + constants_1.CRLF);
    ++smdrFileNo;
    ee.emit("next");
};
const nextFile = () => {
    if (smdrFileNo === smdrFiles.length) {
        console.log(`That's All Folks !`);
        process.exit(Barrel_1.ExitCode.NormalExit);
    }
    else {
        replicateSmdrFile(smdrFiles[smdrFileNo]);
    }
};
ee.on("next", nextFile);
node_dir_1.default.files(sourceDir, (err, files) => {
    if (err) {
        Barrel_1.debugTcs(`Source ${sourceDir} is not a directory...aborting.`);
        process.exit(Barrel_1.ExitCode.GeneralFailure);
    }
    files.sort();
    for (let file of files) {
        let path = file.split("/");
        if (path[path.length - 1].match(constants_1.REGEXP_SMDR_FILENAME)) {
            smdrFiles.push(file);
        }
    }
    nextFile();
});
