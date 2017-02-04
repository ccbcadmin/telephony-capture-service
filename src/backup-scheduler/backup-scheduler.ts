#!/usr/bin/env node

const routineName = 'backup-scheduler';

// Ensure the presence of required environment variables
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	BACKUP_SCHEDULE: str(),
});

const exec = require('child_process').exec;

const barmanBackup = () => {
	const child=exec(`barman backup pg1`, (error, stdout, stderr) => {
		if (error) {
			console.log(`Unable to backup pg1: `, JSON.stringify(error, null, 4));
		}
		if (stdout) {
			console.log(`Backup Successful:\n${stdout}`);
		}
		if (stderr) {
			console.log(`stderr:\n${stderr}`);
		}
	});
}
console.log(`Backup Cron Pattern: '${env.BACKUP_SCHEDULE}'`);
const CronJob = require('cron').CronJob;
try {
	new CronJob(env.BACKUP_SCHEDULE, barmanBackup, null, true, 'America/Los_Angeles');
}
catch (e) {
	console.log(JSON.stringify(e, null, 4));
	console.log(`BACKUP_SCHEDULE='${env.BACKUP_SCHEDULE}' is Not a Valid Cron Pattern`);
	process.exit(1);
}

// Kick cron into life
exec('cron');

process.on('SIGTERM', () => {
	console.log(`\r${routineName}: Terminated`);
	process.exit(0);
});

process.on('SIGINT', () => {
	console.log(`\r${routineName}: Terminated`);
	process.exit(0);
});

console.log(`${routineName}: Started`);

// Routinely restart in order to remove defunct child processes
setTimeout(() => {
	console.log('Backup Scheduler Exiting');
	process.exit(0)
}, 3600000);
