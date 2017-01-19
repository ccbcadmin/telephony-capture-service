"use strict";
const $ = require("../share/constants");
const server_socket_1 = require("../share/server-socket");
const queue_1 = require("../share/queue");
const routineName = 'pbx-interface';
console.log(`Restarting ${routineName}`);
const _ = require('lodash');
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TMS_ACTIVE: num(),
    TCS_PORT: num(),
    DB_QUEUE: str(),
    TMS_QUEUE: str()
});
process.on('SIGTERM', () => {
    console.log('Telephony Capture Service: Terminated');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
    process.exit(0);
});
let tmsQueue;
let databaseQueue;
let leftOver = Buffer.alloc(0);
const queueSmdrMessages = (data) => {
    let unprocessedData = Buffer.concat([leftOver, data]);
    const crLfIndexOf = unprocessedData.indexOf($.CRLF);
    if (crLfIndexOf < 0) {
        leftOver = Buffer.alloc(unprocessedData.length);
        unprocessedData.copy(leftOver);
    }
    else {
        databaseQueue.sendToQueue(unprocessedData.slice(0, crLfIndexOf + 2));
        leftOver = Buffer.alloc(unprocessedData.length - (crLfIndexOf + 2));
        unprocessedData.copy(leftOver, 0, crLfIndexOf + 2);
    }
};
const dataSink = (data) => {
    env.TMS_ACTIVE ? tmsQueue.sendToQueue(data) : _.noop;
    queueSmdrMessages(data);
};
tmsQueue = env.TMS_ACTIVE ? new queue_1.Queue(env.TMS_QUEUE) : null;
databaseQueue = new queue_1.Queue(env.DB_QUEUE);
new server_socket_1.ServerSocket(routineName, env.TCS_PORT, dataSink);
