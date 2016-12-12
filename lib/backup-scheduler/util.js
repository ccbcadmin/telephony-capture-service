"use strict";
const util_2 = require("../share/util");
const dir = require('node-dir');
const exec = require('child_process').exec;
const moment = require('moment');
const fs = require('fs-extra');
exports.backupDatabase = () => {
    console.log('Database Backup Starting...');
    exec(`pg_basebackup -D /postgres_backups/${moment().format('YYYY-MM-DDTHH-mm-ss')} -h ${util_2.networkIP} -U postgres  -F tar`, (error, stdout, stderr) => {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
        }
    });
};
exports.purgeAgedBackups = (backupDirectory, backupPurgePeriodUnits, backupPurgePeriodLimit) => {
    dir.subdirs(backupDirectory, (err, subdirs) => {
        if (err) {
            throw err;
        }
        for (let subdir of subdirs) {
            fs.stat(subdir, (err, stats) => {
                if (moment(stats.mtime) < moment().subtract(backupPurgePeriodLimit, backupPurgePeriodUnits)) {
                    fs.remove(subdir, (err) => {
                        if (err)
                            return console.error(err);
                        console.log(`Backup ${subdir} deleted.`);
                    });
                }
            });
        }
    });
};
