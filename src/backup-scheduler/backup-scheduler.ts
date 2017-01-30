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
	console.log(`Start Database Backup`);
	exec(`barman backup pg1`, error => {
		if (error) {
			console.log(`Unable to backup pg1: JSON.stringify(${error},null,4)`);
		}
	});
}

const spawn = require('child_process').spawn;
exec('cron');

// exec('barman cron');

process.on('SIGTERM', () => {
	console.log(`\r${routineName}: Terminated`);
	process.exit(0);
});

process.on('SIGINT', () => {
	console.log(`\r${routineName}: Terminated`);
	process.exit(0);
});

console.log(`${routineName}: Started`);

// Let everything stabilize and then trigger the backup schedule
setInterval(() => {
	require('node-schedule').scheduleJob(env.BACKUP_SCHEDULE, barmanBackup);
 }, 5000);
