#!/usr/bin/env node
const routineName = 'backup-scheduler';
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    BACKUP_SCHEDULE: str(),
});
const exec = require('child_process').exec;
let child;
const barmanBackup = () => {
    const child = exec(`barman backup pg1`, (error, stdout, stderr) => {
        if (error) {
            console.log(`Unable to backup pg1: `, JSON.stringify(error, null, 4));
        }
        else {
            console.log(`Backup Successful:\nstdout:\n${stdout}\nstderr:\n${stderr}`);
        }
    });
};
const killChildProcess = () => {
    console.log('Kill Child');
    process.kill(child.pid, 'SIGTERM');
};
const CronJob = require('cron').CronJob;
new CronJob('* * * * *', barmanBackup, killChildProcess, true, 'America/Los_Angeles');
process.on('SIGTERM', () => {
    console.log(`\r${routineName}: Terminated`);
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log(`\r${routineName}: Terminated`);
    process.exit(0);
});
console.log(`${routineName}: Started`);
setTimeout(() => {
}, 5000);
