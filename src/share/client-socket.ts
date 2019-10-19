// tslint:disable: indent

import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Rx";

const net = require("net");
import _ from "lodash";
import moment from "moment";
import { logError, logInfo } from "../Barrel";

type callback = (() => void) | undefined;

export class ClientSocket {

	private socket = new net.Socket();

	private linkRetrySubscription: Subscription | undefined;
	private linkConnectSubscription: Subscription | undefined = undefined;
	private linkCloseSubscription: Subscription | undefined;

	private linkRetryTimer$ = Observable.interval(5000).timeInterval().startWith().map(() => moment());
	private linkConnect$ = Observable.fromEvent(this.socket, "connect").map(() => moment());
	private linkClose$ = Observable.fromEvent(this.socket, "close").map(() => moment());

	constructor(private params: {
		linkName: string,
		host: string,
		port: number,
		connectHandler?: callback,
		disconnectHandler?: callback,
	}) {

		const { linkName } = params;

		// Routinely track socket errors
		Observable.fromEvent(this.socket, "error").subscribe((error) => {
			logError(`${linkName} Link Error:\n${JSON.stringify(error, null, 4)}`);
		});

		// Begin the show
		this.linkRetrySubscription = this.linkRetryTimer$.subscribe(this.linkRetry);
	}

	private linkConnect = () => {

		const { connectHandler, linkName } = this.params;

		logInfo(`${linkName}: Connected`);

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

		connectHandler ? connectHandler() : _.noop;
	};

	private linkClosed = () => {

		const { disconnectHandler, linkName } = this.params;

		// Stop listening to the link close event
		this.linkCloseSubscription ? this.linkCloseSubscription.unsubscribe() : _.noop;
		this.linkCloseSubscription = undefined;

		// Retry the link
		this.linkRetrySubscription = this.linkRetryTimer$.subscribe(this.linkRetry);

		logError(`${linkName}: Closed`);
		disconnectHandler ? disconnectHandler() : _.noop;
	};

	private linkRetry = () => {

		const { disconnectHandler, host, linkName, port } = this.params;

		logError(`${linkName}: Retry`);

		this.socket.connect(port, host);
		this.socket.setKeepAlive(true);

		// Start listening for the connect event
		if (!this.linkConnectSubscription) {
			this.linkConnectSubscription = this.linkConnect$.subscribe(this.linkConnect);
		}
	};

	public destroy = (): void => {
		const { linkName, } = this.params;
		logError(`${linkName}: Disconnected`);
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
		new ClientSocket({
			linkName,
			host,
			port,
			connectHandler,
			disconnectHandler
		})));
