"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Barrel_1 = require("../Barrel");
class Process {
    constructor(params) {
        this.params = params;
        const { routineName } = params;
        const msg = `(${routineName}) Started`;
        Barrel_1.logInfo(msg);
        process.on("uncaughtException", (err) => {
            const msg = `(${routineName}) Uncaught Excpetion: ${err.message}`;
            Barrel_1.logError(msg);
            process.exit(100);
        });
        process.on("SIGTERM", () => {
            const msg = `(${routineName}) SIGTERM Received. Aborting`;
            Barrel_1.logFatal(msg);
            process.exit(101);
        });
        process.on("SIGINT", () => {
            const msg = `(${routineName}) SIGINT Received. Aborting`;
            Barrel_1.logFatal(msg);
            process.exit(102);
        });
    }
}
exports.Process = Process;
