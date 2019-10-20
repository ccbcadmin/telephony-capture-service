#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../share/util");
const Barrel_1 = require("../Barrel");
const routineName = "backup-scheduler";
const envalid = require("envalid");
const { str, } = envalid;
const exec = require("child_process").exec;
const CronJob = require("cron").CronJob;
class Backup extends Barrel_1.Process {
    constructor() {
        super({ routineName });
        this.env = envalid.cleanEnv(process.env, {
            BACKUP_SCHEDULE: str()
        });
        this.barmanBackup = () => {
            exec(`barman backup pg1`, (error, stdout, stderr) => {
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
        const { BACKUP_SCHEDULE } = this.env;
        try {
            exec("cron");
            Barrel_1.debugTcs(`Backup Cron Pattern: '${BACKUP_SCHEDULE}'`);
            try {
                new CronJob(this.env.BACKUP_SCHEDULE, this.barmanBackup, null, true, "America/Los_Angeles");
            }
            catch (err) {
                Barrel_1.logError(JSON.stringify(err, null, 4));
                Barrel_1.logError(`BACKUP_SCHEDULE='${BACKUP_SCHEDULE}' is Not a Valid Cron Pattern`);
                process.exit(1);
            }
            util_1.sleep(86400 * 1000).then(() => {
                Barrel_1.logError("Backup Scheduler Exiting");
                process.exit(0);
            });
        }
        catch (err) {
            throw err;
        }
    }
}
new Backup();
