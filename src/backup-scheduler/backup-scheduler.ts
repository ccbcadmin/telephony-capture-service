#!/usr/bin/env node

const routineName = 'barman';

// Ensure the presence of required environment variables
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	BACKUP_SCHEDULE: str(),
});

const exec = require('child_process').exec;

// At startup, arbitrarily assume pg1
let activePostgresContainer = 'pg1';  

// Attempt to backup both pg1 and pg2
const barmanBackup = () => {
	console.log(`barman backup ${activePostgresContainer}`);
	exec(`barman backup ${activePostgresContainer}`, error => {
		if (error) {
			// If here, then first backup attempt failed - try the other container
			activePostgresContainer = activePostgresContainer === 'pg1' ? 'pg2' : 'pg1';
			console.log(`barman backup ${activePostgresContainer}`);
			exec(`barman backup ${activePostgresContainer}`);
		}
	});
}

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
