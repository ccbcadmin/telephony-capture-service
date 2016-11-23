import { CRLF, DATABASE_QUEUE, SMDR_PREAMBLE, TMS_QUEUE } from '../share/constants';
import { ServerSocket } from '../share/server-socket';
import { Queue } from '../share/queue';
import { networkIP } from '../share/utility';

export namespace BackupScheduler {

	const routineName = 'backup-scheduler';
	const _ = require('lodash');
	const moment = require('moment');
	const fs = require('fs-extra');
	const dir = require('node-dir');

	// Ensure the presence of required environment variables
	const envalid = require('envalid');
	const { str, num } = envalid;
	const env = envalid.cleanEnv(process.env, {
		// Need the docker machine IP to link together the various Microservices
		DOCKER_MACHINE_IP: str(),
		BACKUP_DIRECTORY: str(),
		BACKUP_SCHEDULE: str(),
		BACKUP_PURGE_PERIOD_UNITS: str(),
		BACKUP_PURGE_PERIOD_LIMIT: str()
	});

	// Ensure a properly formed Docker Machine IP
	const net = require('net');
	if (!net.isIP(env.DOCKER_MACHINE_IP)) {
		console.log(`${routineName}; Invalid Docker Machine IP: ${env.DOCKER_MACHINE_IP}...aborting.`);
		process.exit(-1);
	}

	// Ensure the backup Epoch is recognized
	if (['minutes', 'hours', 'days', 'months', 'years'].indexOf(env.BACKUP_PURGE_EPOCH) < 0) {
		console.log("BACKUP_PURGE_EPOCH must be one of 'minutes', 'hours', 'days', 'months', or 'years'.  Aborting...");
		process.exit(-1);
	}

	const util = require('util')
	const exec = require('child_process').exec;

	const schedule = require('node-schedule');
	const triggerBackupSchedule = schedule.scheduleJob(env.BACKUP_SCHEDULE, () => {
		console.log('Database Backup Starting...');
		exec(`pg_basebackup -D ${env.BACKUP_DIRECTORY}${moment().format('YYYY-MM-DDTHH-mm-ss')} -h ${env.DOCKER_MACHINE_IP} -U postgres  -F tar -P`, (error, stdout, stderr) => {
			console.log('stdout: ' + stdout);
			console.log('stderr: ' + stderr);
			if (error !== null) {
				console.log('exec error: ' + error);
			}
		});
	});

	const triggerBackupPurging = setInterval(() => {
		// Purge backups after a configurable time period
		dir.subdirs(env.BACKUP_DIRECTORY, (err, subdirs) => {
			if (err) {
				throw err;
			}

			for (let subdir of subdirs) {
				fs.stat(subdir, (err, stats) => {
					// console.log(`${subdir}: ${stats.mtime}, ${moment().subtract (env.BACKUP_PURGE_PERIOD_LIMIT, env.BACKUP_PURGE_PERIOD_UNITS).format ('YYYY-MM-DDTHH-mm-ss')}`);
					if (moment(stats.mtime) < moment().subtract(env.BACKUP_PURGE_PERIOD_LIMIT, env.BACKUP_PURGE_PERIOD_UNITS)) {
						fs.remove(subdir, function (err) {
							if (err) return console.error(err)
							console.log(`Backup ${subdir} deleted.`);
						});
					}
				});
			}
		});
	}, 10000);

	process.on('SIGTERM', () => {
		console.log(`\r${routineName}: Terminated`);
		process.exit(0);
	});

	process.on('SIGINT', () => {
		console.log(`\r${routineName}: Terminated`);
		process.exit(0);
	});

	// Start the show
	triggerBackupSchedule;
	triggerBackupPurging;

	// Ensure that the backup directory exists
	console.log(`${routineName}: Started`);
}
