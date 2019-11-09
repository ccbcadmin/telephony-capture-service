"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("../share/process"));
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
var ExitCode;
(function (ExitCode) {
    ExitCode[ExitCode["NormalExit"] = 0] = "NormalExit";
    ExitCode[ExitCode["GeneralFailure"] = 1] = "GeneralFailure";
    ExitCode[ExitCode["SIGTERM_Exit"] = 2] = "SIGTERM_Exit";
    ExitCode[ExitCode["SIGINT_Exit"] = 3] = "SIGINT_Exit";
})(ExitCode = exports.ExitCode || (exports.ExitCode = {}));
