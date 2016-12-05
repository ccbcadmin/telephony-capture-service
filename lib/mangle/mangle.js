"use strict";
const $ = require('../share/constants');
const util_2 = require('../share/util');
const routineName = 'mangle';
const fs = require('fs');
const dir = require('node-dir');
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    MANGLE_SOURCE_DIRECTORY: str(),
    MANGLE_TARGET_DIRECTORY: str()
});
const eventEmitter = require('events').EventEmitter;
const ee = new eventEmitter;
const zeroPad = (num, places) => {
    var zero = places - num.toString().length + 1;
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
    else if ((phoneNumber.length === 11 && phoneNumber.slice(0, 1) === '1')) {
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
process.on('SIGTERM', () => {
    console.log('Telephony Capture Service: Terminated');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
    process.exit(0);
});
let smdrFiles = [];
let smdrFileNo = 0;
const replicateSmdrFile = (smdrFileName) => {
    let data = fs.readFileSync(smdrFileName).toString();
    let filePart = smdrFileName.split(util_2.pathSeparator());
    const inputFileNameParts = filePart[filePart.length - 1].split('.');
    const outputFile = `${inputFileNameParts[0]}.${zeroPad(Number(inputFileNameParts[1]) + 1, 3)}`;
    const outputPath = [env.MANGLE_TARGET_DIRECTORY, outputFile].join(util_2.pathSeparator());
    process.stdout.write(`Mangling ${smdrFileName} to ${outputPath}: `);
    const fd = fs.openSync(outputPath, 'w');
    let recordCount = 0;
    let unknownRecords = 0;
    let index = 0;
    let next_index = 0;
    while ((next_index = data.indexOf($.CRLF, index)) > 0) {
        const smdrMessage = data.slice(index, next_index);
        index = next_index + 2;
        let raw_call = smdrMessage.split(',');
        if (raw_call.length !== 30) {
            ++unknownRecords;
        }
        else {
            ++recordCount;
            raw_call[3] = substituteDummyPhoneNumber(raw_call[3]);
            raw_call[5] = substituteDummyPhoneNumber(raw_call[5]);
            raw_call[6] = substituteDummyPhoneNumber(raw_call[6]);
            let testSmdr = raw_call.join(',') + $.CRLF;
            fs.writeSync(fd, testSmdr);
        }
    }
    process.stdout.write('SMDR Records: ' + recordCount + ', Unknown Records: ' + unknownRecords + $.CRLF);
    ++smdrFileNo;
    ee.emit('next');
};
const nextFile = () => {
    if (smdrFileNo === smdrFiles.length) {
        console.log(`That's All Folks !`);
        process.exit(0);
    }
    else {
        replicateSmdrFile(smdrFiles[smdrFileNo]);
    }
};
ee.on('next', nextFile);
dir.files(env.MANGLE_SOURCE_DIRECTORY, (err, files) => {
    if (err) {
        console.log(`Source ${env.MANGLE_SOURCE_DIRECTORY} is not a directory...aborting.`);
        process.exit(-1);
    }
    files.sort();
    for (let file of files) {
        let path = file.split(util_2.pathSeparator());
        if (path[path.length - 1].match($.REGEXP_SMDR_FILENAME)) {
            smdrFiles.push(file);
        }
    }
    nextFile();
});
