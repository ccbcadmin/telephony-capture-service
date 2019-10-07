export * from "../TypeScriptUtils/broker";
export * from "../TypeScriptUtils/debug";
export * from "../TypeScriptUtils/logger";
import {
    LogConfigRecord,
    Logger,
} from "../TypeScriptUtils/logger";

export const logConfig: LogConfigRecord = {
    console: {
        enable: true,
        logLevel: "info",
    },
    cloudWatch: {
        enable: false,
        logLevel: "info",
    }
};

Logger.process = new Logger(
    "tcs",
    logConfig);

import { promisify } from "util";
// const { promisify } = require("util");
export const setTimeoutPromise = promisify(setTimeout);
