#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../share/util");
const Barrel_1 = require("../Barrel");
const routineName = "backup-scheduler";
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    BACKUP_SCHEDULE: str()
});
const exec = require("child_process").exec;
const barmanBackup = () => {
    const child = exec(`barman backup pg1`, (error, stdout, stderr) => {
        if (error) {
            Barrel_1.logError(`Unable to backup pg1: `, JSON.stringify(error, null, 4));
        }
        if (stdout) {
            Barrel_1.logError(`Backup Successful:\n${stdout}`);
        }
        if (stderr) {
            Barrel_1.logError(`stderr:\n${stderr}`);
        }
    });
};
Barrel_1.logError(`Backup Cron Pattern: '${env.BACKUP_SCHEDULE}'`);
const CronJob = require("cron").CronJob;
try {
    new CronJob(env.BACKUP_SCHEDULE, barmanBackup, null, true, "America/Los_Angeles");
}
catch (e) {
    Barrel_1.logError(JSON.stringify(e, null, 4));
    Barrel_1.logError(`BACKUP_SCHEDULE='${env.BACKUP_SCHEDULE}' is Not a Valid Cron Pattern`);
    process.exit(1);
}
exec("cron");
process.on("SIGTERM", () => {
    Barrel_1.logError(`\r${routineName}: Terminated`);
    process.exit(0);
});
process.on("SIGINT", () => {
    Barrel_1.logError(`\r${routineName}: Terminated`);
    process.exit(0);
});
Barrel_1.logError(`${routineName}: Started`);
util_1.sleep(86400 * 1000).then(() => {
    Barrel_1.logError("Backup Scheduler Exiting");
    process.exit(0);
});
