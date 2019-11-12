"use strict";
module.exports = {
    apps: [
        {
            name: "pbx-simulator",
            script: "./lib/pbx-simulator/pbx-simulator.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "development",
                PBX_SIMULATOR_SOURCE_DIRECTORY: "smdr-data-005",
                PBX_SIMULATOR_INPUT_FREQUENCY: 20,
                TCS_PORT: 3456,
            },
            env_production: {
                NODE_ENV: "production"
            }
        },
    ]
};
