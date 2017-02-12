#!/usr/bin/env node
var queue_1 = require("../share/queue");
require("rxjs/Rx");
var Observable_1 = require("rxjs/Observable");
const routineName = "tms-interface";
const _ = require("lodash");
const moment = require("moment");
const net = require("net");
let tmsSocket = new net.Socket();
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
let tmsQueue = null;
const dataSink = msg => tmsSocket.write(msg);
let linkRetrySubscription = null;
let linkConnectSubscription = null;
let linkCloseSubscription = null;
Observable_1.Observable.fromEvent(tmsSocket, "error").subscribe((error) => { });
const linkRetryTimer$ = Observable_1.Observable.interval(5000).timeInterval().startWith().map(() => moment());
const linkConnect$ = Observable_1.Observable.fromEvent(tmsSocket, "connect").map(() => moment());
const linkClose$ = Observable_1.Observable.fromEvent(tmsSocket, "close").map(() => moment());
const linkConnect = () => {
    console.log(`${linkName}: Connected`);
    linkConnectSubscription ? linkConnectSubscription.unsubscribe() : _.noop;
    linkConnectSubscription = null;
    linkRetrySubscription ? linkRetrySubscription.unsubscribe() : _.noop;
    linkRetrySubscription = null;
    linkCloseSubscription = linkClose$.subscribe(linkClosed);
    tmsQueue = new queue_1.Queue(env.TMS_QUEUE, null, dataSink, null);
};
const linkClosed = () => {
    console.log(`${linkName}: Closed`);
    linkCloseSubscription ? linkCloseSubscription.unsubscribe() : _.noop;
    linkCloseSubscription = null;
    linkRetrySubscription = linkRetryTimer$.subscribe(linkRetry);
    tmsQueue.close();
};
const linkRetry = () => {
    console.log(`${linkName}: Retry`);
    tmsSocket.connect(env.TMS_PORT, env.TMS_HOST);
    tmsSocket.setKeepAlive(true);
    if (!linkConnectSubscription) {
        linkConnectSubscription = linkConnect$.subscribe(linkConnect);
    }
};
linkRetrySubscription = linkRetryTimer$.subscribe(linkRetry);
console.log(`${routineName}: Started`);
