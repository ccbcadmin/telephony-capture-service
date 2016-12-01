"use strict";
const util = require('./util');
const routineName = 'backup-scheduler';
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    DOCKER_MACHINE_IP: str(),
    BACKUP_DIRECTORY: str(),
    BACKUP_SCHEDULE: str(),
    BACKUP_PURGE_PERIOD_UNITS: str(),
    BACKUP_PURGE_PERIOD_LIMIT: str()
});
const net = require('net');
if (!net.isIP(env.DOCKER_MACHINE_IP)) {
    console.log(`${routineName}; Invalid Docker Machine IP: ${env.DOCKER_MACHINE_IP}...aborting.`);
    process.exit(-1);
}
if (['minutes', 'hours', 'days', 'weeks', 'months', 'years'].indexOf(env.BACKUP_PURGE_PERIOD_UNITS) < 0) {
    console.log("BACKUP_PURGE_EPOCH must be one of 'minutes', 'hours', 'days', 'weeks', 'months', or 'years'.  Aborting...");
    process.exit(-1);
}
require('node-schedule').scheduleJob(env.BACKUP_SCHEDULE, util.backupDatabase);
setInterval(util.purgeAgedBackups, 10000, env.BACKUP_DIRECTORY, env.BACKUP_PURGE_PERIOD_UNITS, env.BACKUP_PURGE_PERIOD_LIMIT);
process.on('SIGTERM', () => {
    console.log(`\r${routineName}: Terminated`);
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log(`\r${routineName}: Terminated`);
    process.exit(0);
});
console.log(`${routineName}: Started`);
