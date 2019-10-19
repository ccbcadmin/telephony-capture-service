"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("../TypeScriptUtils/broker"));
__export(require("../TypeScriptUtils/debug"));
__export(require("../TypeScriptUtils/logger"));
const logger_1 = require("../TypeScriptUtils/logger");
exports.logConfig = {
    console: {
        enable: true,
        logLevel: "info",
    },
    cloudWatch: {
        enable: false,
        logLevel: "info",
    }
};
logger_1.Logger.process = new logger_1.Logger("tcs", exports.logConfig);
const util_1 = require("util");
exports.setTimeoutPromise = util_1.promisify(setTimeout);
