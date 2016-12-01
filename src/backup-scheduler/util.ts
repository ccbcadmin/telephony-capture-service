
const dir = require('node-dir');
const exec = require('child_process').exec;
const moment = require('moment');
const fs = require('fs-extra');

// Ensure the presence of required environment variables
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	// Need the docker machine IP to link together the various Microservices
	DOCKER_HOST_IP: str(),
	BACKUP_DIRECTORY: str()
});

export const backupDatabase = () => {
	console.log('Database Backup Starting...');
	exec(`pg_basebackup -D ${env.BACKUP_DIRECTORY}${moment().format('YYYY-MM-DDTHH-mm-ss')} -h ${env.DOCKER_HOST_IP} -U postgres  -F tar -P`, (error, stdout, stderr) => {
		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if (error !== null) {
			console.log('exec error: ' + error);
		}
	});
}

export const purgeAgedBackups = (backupDirectory: string, backupPurgePeriodUnits: string, backupPurgePeriodLimit: number) => {

	// Purge backups after a configurable time period
	dir.subdirs(backupDirectory, (err, subdirs) => {

		if (err) {
			throw err;
		}
		for (let subdir of subdirs) {
			fs.stat(subdir, (err, stats) => {
				if (moment(stats.mtime) < moment().subtract(backupPurgePeriodLimit, backupPurgePeriodUnits)) {
					fs.remove(subdir, (err) => {
						if (err) return console.error(err)
						console.log(`Backup ${subdir} deleted.`);
					});
				}
			});
		}
	});
}
