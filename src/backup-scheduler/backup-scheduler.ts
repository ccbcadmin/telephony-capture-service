import { ServerSocket } from '../share/server-socket';
import { Queue } from '../share/queue';
import { networkIP } from '../share/util';
import * as util from './util';

const routineName = 'backup-scheduler';

// Ensure the presence of required environment variables
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	// Need the docker machine IP to link together the various Microservices
	BACKUP_SCHEDULE: str(),
	BACKUP_PURGE_PERIOD_UNITS: str(),
	BACKUP_PURGE_PERIOD_LIMIT: str()
});

// Ensure the backup Epoch is recognized
if (['minutes', 'hours', 'days', 'weeks', 'months', 'years'].indexOf(env.BACKUP_PURGE_PERIOD_UNITS) < 0) {
	console.log("BACKUP_PURGE_EPOCH must be one of 'minutes', 'hours', 'days', 'weeks', 'months', or 'years'.  Aborting...");
	process.exit(-1);
}

require('node-schedule').scheduleJob(env.BACKUP_SCHEDULE, util.backupDatabase);

setInterval(util.purgeAgedBackups, 10000, '/postgres_backups', env.BACKUP_PURGE_PERIOD_UNITS, env.BACKUP_PURGE_PERIOD_LIMIT);

process.on('SIGTERM', () => {
	console.log(`\r${routineName}: Terminated`);
	process.exit(0);
});

process.on('SIGINT', () => {
	console.log(`\r${routineName}: Terminated`);
	process.exit(0);
});

console.log(`${routineName}: Started`);

