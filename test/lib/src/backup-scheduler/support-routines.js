"use strict";
const dir = require('node-dir');
const exec = require('child_process').exec;
const moment = require('moment');
const fs = require('fs-extra');
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    DOCKER_MACHINE_IP: str(),
    BACKUP_DIRECTORY: str()
});
exports.backupDatabase = () => {
    console.log('Database Backup Starting...');
    exec(`pg_basebackup -D ${env.BACKUP_DIRECTORY}${moment().format('YYYY-MM-DDTHH-mm-ss')} -h ${env.DOCKER_MACHINE_IP} -U postgres  -F tar -P`, (error, stdout, stderr) => {
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
                    fs.remove(subdir, function (err) {
                        if (err)
                            return console.error(err);
                        console.log(`Backup ${subdir} deleted.`);
                    });
                }
            });
        }
    });
};
