#!/usr/bin/env node

import * as $ from "../share/constants";
import { Queue } from "../share/queue";
import "rxjs/Rx";
import { Observable } from "rxjs/Observable";
import { networkIP } from "../share/util";

const routineName = "tms-interface";

const _ = require("lodash");
const moment = require("moment");
const net = require("net");
let tmsSocket = new net.Socket();
let linkName = "tcs=>tms";

// Ensure the presence of required environment variables
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

// Any data received from the queue, then immediately forward on to the TMS
const dataSink = msg => tmsSocket.write(msg);

let linkRetrySubscription = null;
let linkConnectSubscription = null;
let linkCloseSubscription = null;

// Suppress socket errors
Observable.fromEvent(tmsSocket, "error").subscribe((error) => { });

const linkRetryTimer$ = Observable.interval(5000).timeInterval().startWith().map(() => moment());
const linkConnect$ = Observable.fromEvent(tmsSocket, "connect").map(() => moment());
const linkClose$ = Observable.fromEvent(tmsSocket, "close").map(() => moment());

const linkConnect = () => {

	console.log(`${linkName}: Connected`);

	// Stop listening to the close link connect event
	linkConnectSubscription ? linkConnectSubscription.unsubscribe() : _.noop;
	linkConnectSubscription = null;

	// Stop retrying
	linkRetrySubscription ? linkRetrySubscription.unsubscribe() : _.noop;
	linkRetrySubscription = null;

	// Listen for the socket close
	linkCloseSubscription = linkClose$.subscribe(linkClosed);

	// (Re-)establish a connection to the queue
	tmsQueue = new Queue(env.TMS_QUEUE, null, dataSink, null);
};

const linkClosed = () => {

	console.log(`${linkName}: Closed`);

	// Stop listening to the link close event
	linkCloseSubscription ? linkCloseSubscription.unsubscribe() : _.noop;
	linkCloseSubscription = null;

	// Retry the link
	linkRetrySubscription = linkRetryTimer$.subscribe(linkRetry);

	// Ensure queue reception is stopped
	tmsQueue.close();
};

const linkRetry = () => {

	console.log(`${linkName}: Retry`);

	tmsSocket.connect(env.TMS_PORT, env.TMS_HOST);
	tmsSocket.setKeepAlive(true);

	// Start listening for the connect event
	if (!linkConnectSubscription) {
		linkConnectSubscription = linkConnect$.subscribe(linkConnect);
	}
};

// Start the show
linkRetrySubscription = linkRetryTimer$.subscribe(linkRetry);

console.log(`${routineName}: Started`);
