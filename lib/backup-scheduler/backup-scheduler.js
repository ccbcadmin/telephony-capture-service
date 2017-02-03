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
        if (stdout) {
            console.log(`Backup Successful:\nstdout:\n${stdout}`);
        }
        if (stderr) {
            console.log(`stderr:\n${stderr}`);
        }
        process.kill(child.pid, 'SIGTERM');
    });
};
const killChildProcess = () => {
    console.log('Kill Child');
    process.kill(child.pid, 'SIGTERM');
};
const CronJob = require('cron').CronJob;
try {
    new CronJob(env.BACKUP_SCHEDULE, barmanBackup, killChildProcess, true);
}
catch (e) {
    console.log("cron pattern not valid");
    process.exit(1);
}
process.on('SIGTERM', () => {
    console.log(`\r${routineName}: Terminated`);
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log(`\r${routineName}: Terminated`);
    process.exit(0);
});
console.log(`${routineName}: Started`);
