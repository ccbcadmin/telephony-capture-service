"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Process {
    constructor() {
        process.on("uncaughtException", (err) => {
            try {
                console.log("uncaughtException: ", err);
            }
            catch (err) {
                process.exit(100);
            }
        });
    }
}
exports.Process = Process;
