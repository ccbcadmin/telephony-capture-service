// tslint:disable: indent

import "rxjs/Rx";
import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Rx";

const net = require("net");
const _ = require("lodash");
const moment = require("moment");

type callback = (() => void) | undefined;

export class ClientSocket {

	private socket = new net.Socket();

	private linkRetrySubscription: Subscription | undefined;
	private linkConnectSubscription: Subscription | undefined = undefined;
	private linkCloseSubscription: Subscription | undefined;

	private linkRetryTimer$ = Observable.interval(5000).timeInterval().startWith().map(() => moment());
	private linkConnect$ = Observable.fromEvent(this.socket, "connect").map(() => moment());
	private linkClose$ = Observable.fromEvent(this.socket, "close").map(() => moment());

	constructor(
		private linkName: string,
		private host: string,
		private port: number,
		private connectHandler: callback = undefined,
		private disconnectHandler: callback = undefined) {

		// Routinely track socket errors
		Observable.fromEvent(this.socket, "error").subscribe((error) => {
			console.log(`${this.linkName} Link Error:\n${JSON.stringify(error, null, 4)}`);
		});

		// Begin the show
		this.linkRetrySubscription = this.linkRetryTimer$.subscribe(this.linkRetry);
	}

	private linkConnect = () => {

		console.log(`${this.linkName}: Connected`);

		// Stop listening to the close link connect event
		this.linkConnectSubscription ?
			this.linkConnectSubscription.unsubscribe() :
			_.noop;

		this.linkConnectSubscription = undefined;

		// Stop retrying
		this.linkRetrySubscription ? this.linkRetrySubscription.unsubscribe() : _.noop;
		this.linkRetrySubscription = undefined;

		// Listen for the socket close
		this.linkCloseSubscription = this.linkClose$.subscribe(this.linkClosed);

		this.connectHandler ? this.connectHandler() : _.noop;
	};

	private linkClosed = () => {

		// Stop listening to the link close event
		this.linkCloseSubscription ? this.linkCloseSubscription.unsubscribe() : _.noop;
		this.linkCloseSubscription = undefined;

		// Retry the link
		this.linkRetrySubscription = this.linkRetryTimer$.subscribe(this.linkRetry);

		console.log(`${this.linkName}: Closed`);
		this.disconnectHandler ? this.disconnectHandler() : _.noop;
	};

	private linkRetry = () => {

		console.log(`${this.linkName}: Retry`);

		this.socket.connect(this.port, this.host);
		this.socket.setKeepAlive(true);

		// Start listening for the connect event
		if (!this.linkConnectSubscription) {
			this.linkConnectSubscription = this.linkConnect$.subscribe(this.linkConnect);
		}
	};

	public destroy = (): void => {
		console.log(`${this.linkName}: Disconnected`);
		this.socket.destroy();
	}

	public write = (msg: Buffer): boolean => this.socket.write(msg);
}

export const createClient = (
	linkName: string,
	host: string,
	port: number,
	connectHandler: callback = undefined,
	disconnectHandler: callback = undefined) =>
	new Promise((resolve) => resolve(
		new ClientSocket(
			linkName,
			host,
			port,
			connectHandler,
			disconnectHandler)));
