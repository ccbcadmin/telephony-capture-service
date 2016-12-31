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
    TCS_PORT: num()
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
let leftOver = '';
const queueCompleteMessages = (data) => {
    const unprocessedData = leftOver + data.toString();
    const crLfIndexOf = unprocessedData.indexOf($.CRLF);
    const msg = unprocessedData.match(/\x00\x02\x00\x00\x00\x00(.+)\x0d\x0a/);
    if (msg) {
        databaseQueue.sendToQueue(msg[1]);
        leftOver = unprocessedData.slice(crLfIndexOf + 2);
    }
    else {
        leftOver = unprocessedData.slice(0);
    }
};
const dataSink = (data) => {
    env.TMS_ACTIVE ? tmsQueue.sendToQueue(data.toString()) : _.noop;
    queueCompleteMessages(data);
};
tmsQueue = env.TMS_ACTIVE ? new queue_1.Queue($.TMS_QUEUE) : null;
databaseQueue = new queue_1.Queue($.DATABASE_QUEUE);
new server_socket_1.ServerSocket(routineName, env.TCS_PORT, dataSink);
