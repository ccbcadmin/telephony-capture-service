#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("../share/queue");
const client_socket_1 = require("../share/client-socket");
const routineName = "tms-interface";
const _ = require("lodash");
const moment = require("moment");
const net = require("net");
let linkName = "tcs=>tms";
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TMS_PORT: num(),
    TMS_HOST: str(),
    TMS_QUEUE: str()
});
process.on("SIGTERM", () => {
    console.log(`${routineName}: Terminated`);
    process.exit(0);
});
let tmsQueue;
let tmsClient;
const dataSink = msg => tmsClient.write(msg);
const openQueueChannel = () => { tmsQueue = new queue_1.Queue(env.TMS_QUEUE, dataSink); };
const closeQueueChannel = () => {
    tmsQueue != null ? tmsQueue.close() : _.noop;
};
tmsClient = new client_socket_1.ClientSocket("tcs=>tms", env.TMS_HOST, env.TMS_PORT, openQueueChannel, closeQueueChannel);
console.log(`${routineName}: Started`);
