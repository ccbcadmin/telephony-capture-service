"use strict";
var constants_1 = require('./constants');
var client_socket_1 = require('./share/client-socket');
var TelephonySimulator;
(function (TelephonySimulator) {
    var routineName = 'Telephony Simulator';
    var _ = require('lodash');
    var net = require('net');
    var fs = require('fs');
    var dir = require('node-dir');
    var regexpSmdrFile = /rw[0-9]{6,}.001$/;
    var eventEmitter = require('events').EventEmitter;
    var CRLF = '\r\n';
    var ee = new eventEmitter;
    var smdrFiles = [];
    var smdrFileNo = 0;
    var tscSocket = new client_socket_1.ClientSocket('TCSSIM<=>TCS', '127.0.0.1', 9001);
    var sendSmdrRecords = function (smdrFileName) {
        var data = fs.readFileSync(smdrFileName).toString();
        process.stdout.write('Sending ' + smdrFileName + '  ');
        var index = 0;
        var next_index = 0;
        var recordCount = 0;
        var intervalId = setInterval(function () {
            if ((next_index = data.indexOf(CRLF, index)) < 0) {
                process.stdout.write("\bis complete.  " + recordCount + " SMDR records sent.\r\n");
                clearInterval(intervalId);
                ee.emit('next');
            }
            else {
                ++recordCount;
                var nextMsg = data.slice(index, next_index + 2);
                process.stdout.write(nextMsg);
                if (recordCount % 20 === 5)
                    process.stdout.write('\b-');
                else if (recordCount % 20 === 10)
                    process.stdout.write('\b\\');
                else if (recordCount % 20 === 15)
                    process.stdout.write('\b|');
                else if (recordCount % 20 === 0)
                    process.stdout.write('\b/');
                index = next_index + 2;
                var partition = Math.floor(Math.random() * nextMsg.length);
                var firstPart = nextMsg.slice(0, partition);
                var secondPart = nextMsg.slice(partition);
                tscSocket.write(constants_1.SMDR_PREAMBLE);
                tscSocket.write(firstPart);
                tscSocket.write(secondPart);
            }
        }, 5);
    };
    var next_file = function () {
        if (smdrFileNo === smdrFiles.length) {
            process.exit(0);
        }
        else {
            sendSmdrRecords(smdrFiles[smdrFileNo]);
            ++smdrFileNo;
        }
    };
    if (process.argv.length !== 5) {
        console.log("telephony-simulator: " + process.argv.slice(2).join(' ') + ", Incorrect number of parameters");
        process.exit(0);
    }
    else if (!net.isIP(process.argv[3])) {
        console.log("telephony-simulator: " + process.argv[3] + ", Invalid IP Address");
        process.exit(0);
    }
    else if (!process.argv[4].match(/^\d+$/)) {
        console.log("telephony-simulator: " + process.argv[4] + ", Invalid Port");
        process.exit(0);
    }
    ee.on('next', next_file);
    dir.files(process.argv[2] ? process.argv[2] : '.', function (err, files) {
        if (err)
            throw err;
        files.sort();
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            var path = file.split('\\');
            if (path[path.length - 1].match(regexpSmdrFile)) {
                smdrFiles.push(file);
            }
        }
        next_file();
    });
})(TelephonySimulator = exports.TelephonySimulator || (exports.TelephonySimulator = {}));
