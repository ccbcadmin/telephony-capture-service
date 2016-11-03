"use strict";
var CreateSmdrTestFiles;
(function (CreateSmdrTestFiles) {
    const fs = require('fs');
    const dir = require('node-dir');
    const regexp = /^rw[0-9]{6,}.001$/;
    let substituteMap = new Map();
    const substituteDummyPhoneNumber = (phoneNumber) => {
        if (phoneNumber.length === 10) {
            return phoneNumber.slice(0, 6) + ("" + Math.random()).substring(2, 6);
        }
        else if ((phoneNumber.length === 11 && phoneNumber.slice(0, 1) === '1')) {
            return phoneNumber.slice(0, 7) + ("" + Math.random()).substring(2, 6);
        }
        else {
            return phoneNumber;
        }
    };
    const replicateSmdrFile = (smrdFile) => {
        let filePart = smrdFile.split('\\');
        filePart[filePart.length - 1] = 'test_' + filePart[filePart.length - 1];
        let outputFilename = filePart.join('\\');
        const lr = new (require('line-by-line'))(smrdFile);
        const fd = fs.openSync(outputFilename, 'w');
        let smdrRecordsFound = 0;
        let unknownRecords = 0;
        lr.on('error', err => {
            console.log('error: ', err);
            process.exit();
        });
        lr.on('line', (line) => {
            lr.pause();
            let raw_call = line.split(',');
            if (raw_call.length !== 30) {
                ++unknownRecords;
                lr.resume();
            }
            else {
                ++smdrRecordsFound;
                raw_call[3] = substituteDummyPhoneNumber(raw_call[3]);
                raw_call[5] = substituteDummyPhoneNumber(raw_call[5]);
                raw_call[6] = substituteDummyPhoneNumber(raw_call[6]);
                let testSmdr = raw_call.join(',') + '\r\n';
                fs.writeSync(fd, testSmdr);
                lr.resume();
            }
        });
        lr.on('end', () => {
            process.stdout.write("\n");
            fs.close(fd);
        });
    };
    dir.files(process.argv[2] ? process.argv[2] : '.', (err, files) => {
        if (err)
            throw err;
        for (let file of files) {
            let path = file.split('\\');
            if (path[path.length - 1].match(regexp)) {
                console.log('Replicating: ', path[path.length - 1]);
                replicateSmdrFile(file);
            }
        }
    });
})(CreateSmdrTestFiles = exports.CreateSmdrTestFiles || (exports.CreateSmdrTestFiles = {}));
