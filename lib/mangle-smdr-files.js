"use strict";
const constants_1 = require('./share/constants');
const utility_1 = require('./share/utility');
var CreateSmdrTestFiles;
(function (CreateSmdrTestFiles) {
    const fs = require('fs');
    const dir = require('node-dir');
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
    let smdrFiles = [];
    let smdrFileNo = 0;
    const replicateSmdrFile = (smdrFileName) => {
        let data = fs.readFileSync(smdrFileName).toString();
        let filePart = smdrFileName.split(utility_1.pathSeparator());
        const inputFileNameParts = filePart[filePart.length - 1].split('.');
        const outputFile = `${inputFileNameParts[0]}.${zeroPad(Number(inputFileNameParts[1]) + 1, 3)}`;
        const outputPath = [process.argv[3], outputFile].join(utility_1.pathSeparator());
        process.stdout.write(`Mangling ${smdrFileName} to ${outputPath}: `);
        const fd = fs.openSync(outputPath, 'w');
        let recordCount = 0;
        let unknownRecords = 0;
        let index = 0;
        let next_index = 0;
        while ((next_index = data.indexOf(constants_1.CRLF, index)) > 0) {
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
                let testSmdr = raw_call.join(',') + '\r\n';
                fs.writeSync(fd, testSmdr);
            }
        }
        process.stdout.write('SMDR Records: ' + recordCount + ', Unknown Records: ' + unknownRecords + constants_1.CRLF);
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
    if (process.argv.length !== 4) {
        console.log(`Usage: node ${__filename} SourceDirectory TargetDirectory`);
        process.exit(-1);
    }
    if (process.argv[2] === process.argv[3]) {
        console.log(`Usage: node ${__filename} SourceDirectory TargetDirectory\nSourceDirectory and TargetDirectory cannot be the same.`);
        process.exit(-1);
    }
    try {
        fs.accessSync(process.argv[2]);
        if (!fs.lstatSync(process.argv[2]).isDirectory()) {
            console.log(`Usage: node ${__filename} SourceDirectory TargetDirectory\n'${process.argv[2]}' must be a directory`);
            process.exit(-1);
        }
    }
    catch (e) {
        console.log(`Usage: node ${__filename} SourceDirectory TargetDirectory\n'${process.argv[2]}' must be a directory`);
        process.exit(-1);
    }
    try {
        fs.accessSync(process.argv[3]);
        if (!fs.lstatSync(process.argv[3]).isDirectory()) {
            console.log(`Usage: node ${__filename} SourceDirectory TargetDirectory\n'${process.argv[3]}' must be a directory`);
            process.exit(-1);
        }
    }
    catch (e) {
        console.log(`Usage: node ${__filename} SourceDirectory TargetDirectory\n'${process.argv[3]}' must be a directory`);
        process.exit(-1);
    }
    ee.on('next', nextFile);
    dir.files(process.argv[2], (err, files) => {
        if (err)
            throw err;
        files.sort();
        for (let file of files) {
            let path = file.split(utility_1.pathSeparator());
            if (path[path.length - 1].match(utility_1.regExpSmdrFileName)) {
                smdrFiles.push(file);
            }
        }
        nextFile();
    });
})(CreateSmdrTestFiles = exports.CreateSmdrTestFiles || (exports.CreateSmdrTestFiles = {}));
