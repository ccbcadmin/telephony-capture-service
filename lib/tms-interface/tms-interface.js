"use strict";
const $ = require('../share/constants');
const queue_1 = require('../share/queue');
require('rxjs/Rx');
const Observable_1 = require('rxjs/Observable');
const routineName = 'tms-interface';
const _ = require('lodash');
const moment = require('moment');
const net = require('net');
let tmsSocket = new net.Socket();
let linkName = 'TMS_IF<=>TMS';
const envalid = require('envalid');
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TMS_HOST: str(),
    TMS_PORT: num()
});
console.log(`${routineName}: Started`);
process.on('SIGTERM', () => {
    console.log(`${routineName}: Terminated`);
    process.exit(0);
});
const dataSink = msg => tmsSocket.write(msg.content.toString());
let tmsQueue = null;
Observable_1.Observable.fromEvent(tmsSocket, 'error').subscribe((data) => { });
let reconnectSubscription = null;
let transmitSubscription = null;
const retryConnectTimer$ = Observable_1.Observable.interval(5000).timeInterval().startWith().map(() => moment());
const tmsSocketConnect$ = Observable_1.Observable.fromEvent(tmsSocket, 'connect').map(() => moment());
const tmsSocketClose$ = Observable_1.Observable.fromEvent(tmsSocket, 'close').startWith(null).map(() => moment());
tmsSocketConnect$.subscribe((data) => {
    console.log(`${linkName}: Connected`);
    reconnectSubscription.unsubscribe();
    reconnectSubscription = null;
    tmsQueue = new queue_1.Queue($.TMS_QUEUE, dataSink);
});
tmsSocketClose$.subscribe((data) => {
    if (transmitSubscription) {
        transmitSubscription.unsubscribe();
        transmitSubscription = null;
    }
    if (tmsQueue) {
        tmsQueue.close();
        tmsQueue = null;
    }
    if (!reconnectSubscription) {
        reconnectSubscription = retryConnectTimer$.subscribe(data => {
            console.log(`${linkName}: Opening link...`);
            tmsSocket.connect(env.TMS_PORT, env.TMS_HOST);
            tmsSocket.setKeepAlive(true);
        });
    }
});
