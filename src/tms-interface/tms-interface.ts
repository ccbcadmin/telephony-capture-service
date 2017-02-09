#!/usr/bin/env node

import * as $ from '../share/constants';
import { ClientSocket } from '../share/client-socket';
import { Queue } from '../share/queue';
import 'rxjs/Rx';
import { Observable } from 'rxjs/Observable';
import { networkIP } from '../share/util';

const routineName = 'tms-interface';

const _ = require('lodash');
const moment = require('moment');
const net = require('net');
let tmsSocket = new net.Socket();
let linkName = 'tms-interface=>tms';

// Ensure the presence of required environment variables
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

// 'dataSink' returns true if the socket write succeeds, otherwise crash out
const dataSink = msg => {
	if (tmsSocket.write(msg)) {
		return true;
	}
	else {
		tmsQueue.close();
		process.exit(1);
	}
}

// Suppress socket errors
Observable.fromEvent(tmsSocket, 'error').subscribe((data) => { });

const tmsSocketConnect$ = Observable.fromEvent(tmsSocket, 'connect').map(() => moment());
const tmsSocketClose$ = Observable.fromEvent(tmsSocket, 'close').startWith(null).map(() => moment());

tmsSocketConnect$.subscribe((data) => {
	console.log(`${linkName}: Connected`);

	// (Re-)establish a connection to the queue
	tmsQueue = new Queue(env.TMS_QUEUE, null, dataSink, null);
});

tmsSocketClose$.subscribe((data) => {

	console.log(`${linkName}: Link Lost`);

	// Ensure queue reception is stopped
	if (tmsQueue) {
		tmsQueue.close();
		tmsQueue = null;
	}

	tmsSocket.connect(env.TMS_PORT, env.TMS_HOST);
	tmsSocket.setKeepAlive(true);
});

console.log(`${routineName}: Started`);

