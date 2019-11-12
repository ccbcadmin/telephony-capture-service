#!/usr/bin/env node
// tslint:disable: indent

import { sleep } from "../share/util";
import { logError, Process, debugTcs } from "../Barrel";
const routineName = "backup-scheduler";

const envalid = require("envalid");
const { str, } = envalid;

const exec = require("child_process").exec;
const CronJob = require("cron").CronJob;

class Backup extends Process {

	// Ensure the presence of required environment variables
	private env = envalid.cleanEnv(process.env, {
		BACKUP_SCHEDULE: str()
	});

	constructor() {

		super({ routineName });
		const { BACKUP_SCHEDULE } = this.env;

		try {

			debugTcs(`Backup Cron Pattern: '${BACKUP_SCHEDULE}'`);

			// Kick cron into life
			exec("cron");

			try {
				new CronJob(
					this.env.BACKUP_SCHEDULE,
					this.barmanBackup,
					null,
					true,
					"America/Los_Angeles");

			} catch (err) {
				logError(JSON.stringify(err, null, 4));
				logError(
					`BACKUP_SCHEDULE='${BACKUP_SCHEDULE}' is Not a Valid Cron Pattern`
				);
				process.exit(1);
			}

			// Routinely restart in order to remove defunct child processes
			sleep(86400 * 1000).then(() => {
				logError("Backup Scheduler Exiting");
				process.exit(0);
			});

		} catch (err) {
			throw err;
		}
	}

	private barmanBackup = () => {

		exec(
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
}

new Backup();
