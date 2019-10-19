#!/usr/bin/env node
// tslint:disable: indent

import { sleep } from "../share/util";
import { logError } from "../Barrel";
const routineName = "backup-scheduler";

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	BACKUP_SCHEDULE: str()
});

const exec = require("child_process").exec;

const barmanBackup = () => {
	const child = exec(
		`barman backup pg1`,
		(error: Error, stdout: WindowConsole, stderr: WindowConsole) => {

			if (error) {
				logError(`Unable to backup pg1: `, JSON.stringify(error, null, 4));
			}
			if (stdout) {
				logError(`Backup Successful:\n${stdout}`);
			}
			if (stderr) {
				logError(`stderr:\n${stderr}`);
			}
		});
};

logError(`Backup Cron Pattern: '${env.BACKUP_SCHEDULE}'`);
const CronJob = require("cron").CronJob;
try {
	new CronJob(
		env.BACKUP_SCHEDULE,
		barmanBackup,
		null,
		true,
		"America/Los_Angeles"
	);
} catch (e) {
	logError(JSON.stringify(e, null, 4));
	logError(
		`BACKUP_SCHEDULE='${env.BACKUP_SCHEDULE}' is Not a Valid Cron Pattern`
	);
	process.exit(1);
}

// Kick cron into life
exec("cron");

process.on("SIGTERM", () => {
	logError(`\r${routineName}: Terminated`);
	process.exit(0);
});

process.on("SIGINT", () => {
	logError(`\r${routineName}: Terminated`);
	process.exit(0);
});

logError(`${routineName}: Started`);

// Routinely restart in order to remove defunct child processes
sleep(86400 * 1000).then(() => {
	logError("Backup Scheduler Exiting");
	process.exit(0);
});
