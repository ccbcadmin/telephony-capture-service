"use strict";
var CreateSmdrTestFiles;
(function (CreateSmdrTestFiles) {
    var fs = require('fs');
    var dir = require('node-dir');
    var regexp = /^rw[0-9]{6,}.001$/;
    var substituteDummyPhoneNumber = function (phoneNumber) {
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
    var replicateSmdrFile = function (smrdFile) {
        var filePart = smrdFile.split('\\');
        filePart[filePart.length - 1] = 'test_' + filePart[filePart.length - 1];
        var outputFilename = filePart.join('\\');
        var lr = new (require('line-by-line'))(smrdFile);
        var fd = fs.openSync(outputFilename, 'w');
        var smdrRecordsFound = 0;
        var unknownRecords = 0;
        lr.on('error', function (err) {
            console.log('error: ', err);
            process.exit();
        });
        lr.on('line', function (line) {
            lr.pause();
            var raw_call = line.split(',');
            if (raw_call.length !== 30) {
                ++unknownRecords;
                lr.resume();
            }
            else {
                ++smdrRecordsFound;
                raw_call[3] = substituteDummyPhoneNumber(raw_call[3]);
                raw_call[5] = substituteDummyPhoneNumber(raw_call[5]);
                raw_call[6] = substituteDummyPhoneNumber(raw_call[6]);
                var testSmdr = raw_call.join(',') + '\r\n';
                fs.writeSync(fd, testSmdr);
                lr.resume();
            }
        });
        lr.on('end', function () {
            process.stdout.write("\n");
            fs.close(fd);
        });
    };
    dir.files(process.argv[2] ? process.argv[2] : '.', function (err, files) {
        if (err)
            throw err;
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            var path = file.split('\\');
            if (path[path.length - 1].match(regexp)) {
                console.log('Replicating: ', path[path.length - 1]);
                replicateSmdrFile(file);
            }
        }
    });
})(CreateSmdrTestFiles = exports.CreateSmdrTestFiles || (exports.CreateSmdrTestFiles = {}));
