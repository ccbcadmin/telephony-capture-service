#!/usr/bin/env node
"use strict";
const queue_1 = require('../share/queue');
require('rxjs/Rx');
const Observable_1 = require('rxjs/Observable');
const routineName = 'tms-interface';
const _ = require('lodash');
const moment = require('moment');
const net = require('net');
let tmsSocket = new net.Socket();
let linkName = 'tms-interface=>tms';
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TMS_PORT: num(),
    TMS_HOST: str(),
    TMS_QUEUE: str()
});
process.on('SIGTERM', () => {
    console.log(`${routineName}: Terminated`);
    process.exit(0);
});
let tmsQueue = null;
const dataSink = msg => {
    if (tmsSocket.write(msg)) {
        return true;
    }
    else {
        tmsQueue.close();
        process.exit(1);
    }
};
Observable_1.Observable.fromEvent(tmsSocket, 'error').subscribe((data) => { });
const tmsSocketConnect$ = Observable_1.Observable.fromEvent(tmsSocket, 'connect').map(() => moment());
const tmsSocketClose$ = Observable_1.Observable.fromEvent(tmsSocket, 'close').startWith(null).map(() => moment());
tmsSocketConnect$.subscribe((data) => {
    console.log(`${linkName}: Connected`);
    tmsQueue = new queue_1.Queue(env.TMS_QUEUE, null, dataSink, null);
});
tmsSocketClose$.subscribe((data) => {
    console.log(`${linkName}: Link Lost`);
    if (tmsQueue) {
        tmsQueue.close();
        tmsQueue = null;
    }
    tmsSocket.connect(env.TMS_PORT, env.TMS_HOST);
    tmsSocket.setKeepAlive(true);
});
console.log(`${routineName}: Started`);
