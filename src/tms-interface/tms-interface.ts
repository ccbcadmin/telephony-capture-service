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
let linkName = 'TMS_IF<=>TMS';

// Ensure the presence of required environment variables
const envalid = require('envalid');
const { str, num } = envalid;

const env = envalid.cleanEnv(process.env, {
	TMS_PORT: num(),
	TMS_HOST: str(),
	TMS_QUEUE: str()
});

console.log ('networkIP: ', networkIP);

console.log(`${routineName}: Started`);

process.on('SIGTERM', () => {
	console.log(`${routineName}: Terminated`);
	process.exit(0);
});

const dataSink = msg =>
	tmsSocket.write(msg.content.toString());

let tmsQueue = null;

// Suppress socket errors
Observable.fromEvent(tmsSocket, 'error').subscribe((data) => { });

let reconnectSubscription: any = null;
let transmitSubscription: any = null;

const retryConnectTimer$ = Observable.interval(5000).timeInterval().startWith().map(() => moment());
const tmsSocketConnect$ = Observable.fromEvent(tmsSocket, 'connect').map(() => moment());
const tmsSocketClose$ = Observable.fromEvent(tmsSocket, 'close').startWith(null).map(() => moment());

tmsSocketConnect$.subscribe((data) => {
	console.log(`${linkName}: Connected`);

	// Stop trying to reconnnect
	reconnectSubscription.unsubscribe();
	reconnectSubscription = null;

	// (Re-)establish a connect to the queue
	tmsQueue = new Queue(env.TMS_QUEUE, dataSink);
});

tmsSocketClose$.subscribe((data) => {

	if (transmitSubscription) {
		transmitSubscription.unsubscribe();
		transmitSubscription = null;
	}

	// Ensure queue reception is stopped
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
