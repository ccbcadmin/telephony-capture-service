#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const queue_1 = require("../share/queue");
const client_socket_1 = require("../share/client-socket");
const Barrel_1 = require("../Barrel");
const routineName = "tms-interface";
const net = require("net");
const linkName = "tcs=>tms";
const envalid = require("envalid");
const { str, num } = envalid;
process.on("SIGTERM", () => {
    Barrel_1.logError(`${routineName}: Terminated`);
    process.exit(0);
});
class TmsInterface extends Barrel_1.Process {
    constructor() {
        super({ routineName });
        this.env = envalid.cleanEnv(process.env, {
            TMS_PORT: num(),
            TMS_HOST: str(),
            TMS_QUEUE: str()
        });
        this.dataSink = (msg) => Promise.resolve(this.tmsClient.write(msg.content));
        this.openQueueChannel = () => {
            this.tmsQueue =
                new queue_1.Queue({
                    queueName: this.env.TMS_QUEUE,
                    consumer: this.dataSink,
                });
        };
        this.closeQueueChannel = () => {
            this.tmsQueue != null ? this.tmsQueue.close() : lodash_1.default.noop;
        };
        this.tmsClient = new client_socket_1.ClientSocket({
            linkName,
            host: this.env.TMS_HOST,
            port: this.env.TMS_PORT,
            connectHandler: this.openQueueChannel,
            disconnectHandler: this.closeQueueChannel
        });
    }
}
exports.TmsInterface = TmsInterface;
try {
    new TmsInterface();
}
catch (err) {
    Barrel_1.logError(err.message);
    process.exit(0);
}
