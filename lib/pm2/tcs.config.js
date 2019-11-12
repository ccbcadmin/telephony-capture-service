"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env = {
    NODE_ENV: "development",
    BACKUP_SCHEDULE: "0 9 * * *",
    BARMAN_HOME: "/home/barman",
    DATABASE: "prod",
    DB_QUEUE: "PROD_DB_QUEUE",
    PBX_SIMULATOR_SOURCE_DIRECTORY: "smdr-data-005",
    PBX_SIMULATOR_INPUT_FREQUENCY: 20,
    TCS_PORT: 3456,
    TMS_ACTIVE: 1,
    TMS_HOST: "localhost",
    TMS_PORT: 6543,
    TMS_QUEUE: "PROD_TMS_QUEUE",
};
module.exports = {
    apps: [
        {
            name: "backup-scheduler",
            script: "./lib/backup-scheduler/backup-scheduler.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "development",
                BACKUP_SCHEDULE: "0 9 * * *",
                BARMAN_HOME: "/home/barman",
            },
        },
        {
            name: "pbx-interface",
            script: "./lib/pbx-interface/pbx-interface.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env,
            env_production: {
                NODE_ENV: "production"
            },
        },
        {
            name: "database-interface",
            script: "./lib/database-interface/database-interface.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env,
            env_production: {
                NODE_ENV: "production"
            }
        },
        {
            name: "tms-interface",
            script: "./lib/tms-interface/tms-interface.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env,
            env_production: {
                NODE_ENV: "production"
            },
        },
        {
            name: "tms-simulator",
            script: "./lib/tms-simulator/tms-simulator.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env,
            env_production: {
                NODE_ENV: "production"
            },
        }
    ]
};
