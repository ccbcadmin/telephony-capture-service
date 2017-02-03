#!/usr/bin/env node
const routineName = 'backup-scheduler';
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    BACKUP_SCHEDULE: str(),
});
const exec = require('child_process').exec;
exec.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});
const barmanBackup = () => {
    exec(`barman backup pg1`, (error, stdout, stderr) => {
        if (error) {
            console.log(`Unable to backup pg1: `, JSON.stringify(error, null, 4));
        }
        else {
            console.log(`Backup Successful:\nstdout: ${stdout}, stderr: ${stderr}`);
        }
    });
};
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
    const spawn = require('child_process').spawn;
    exec('cron');
    require('node-schedule').scheduleJob(env.BACKUP_SCHEDULE, barmanBackup);
}, 5000);
