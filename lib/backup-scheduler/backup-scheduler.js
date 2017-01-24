#!/usr/bin/env node
const routineName = 'barman';
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    BACKUP_SCHEDULE: str(),
});
const exec = require('child_process').exec;
const retryLogic = '--retry-time 3 --retry-sleep 10';
let activePostgresContainer = 'pg1';
const barmanBackup = () => {
    console.log(`backup ${activePostgresContainer}`);
    exec(`barman backup ${retryLogic} ${activePostgresContainer}`, error => {
        if (error) {
            console.log(`Unable to backup ${activePostgresContainer}: ${error}`);
            activePostgresContainer = activePostgresContainer === 'pg1' ? 'pg2' : 'pg1';
            console.log(`barman backup ${activePostgresContainer}`);
            exec(`barman backup ${retryLogic} ${activePostgresContainer}`);
        }
    });
};
console.log('Start cron');
const spawn = require('child_process').spawn;
exec('cron');
exec('barman cron');
process.on('SIGTERM', () => {
    console.log(`\r${routineName}: Terminated`);
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log(`\r${routineName}: Terminated`);
    process.exit(0);
});
require('node-schedule').scheduleJob(env.BACKUP_SCHEDULE, barmanBackup);
console.log(`${routineName}: Started`);
setInterval(() => { }, 5000);
