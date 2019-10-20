import { debugTcs, logInfo, logError, logFatal } from "../Barrel";

export class Process {

    constructor(protected params: { routineName: string }) {

        const { routineName } = params;

        const msg = `(${routineName}) Started`;
        logInfo(msg);

        process.on("uncaughtException", (err) => {
            const msg = `(${routineName}) Uncaught Excpetion: ${err.message}`;
            logError(msg);
            process.exit(100);
        });

        process.on("SIGTERM", () => {
            const msg = `(${routineName}) SIGTERM Received. Aborting`;
            logFatal(msg);
            process.exit(101);
        });

        process.on("SIGINT", () => {
            const msg = `(${routineName}) SIGINT Received. Aborting`;
            logFatal(msg); process.exit(102);
        });

    }
}