import "rxjs/Rx";
import { Observable } from "rxjs/Observable";

const net = require("net");
const _ = require("lodash");
const moment = require("moment");

type callback = () => void;

export class ClientSocket {

	private socket = new net.Socket();

	private linkName: string;
	private host: string;
	private port: number;
	private connectHandler: callback;
	private disconnectHandler: callback;

	private linkRetrySubscription = null;
	private linkConnectSubscription = null;
	private linkCloseSubscription = null;

	private linkRetryTimer$ = Observable.interval(5000).timeInterval().startWith().map(() => moment());
	private linkConnect$ = Observable.fromEvent(this.socket, "connect").map(() => moment());
	private linkClose$ = Observable.fromEvent(this.socket, "close").map(() => moment());

	constructor(linkName: string, host: string, port: number, connectHandler: callback = null, disconnectHandler: callback = null) {

		this.linkName = linkName;
		this.host = host;
		this.port = port;
		this.connectHandler = connectHandler;
		this.disconnectHandler = disconnectHandler;

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
		this.linkConnectSubscription ? this.linkConnectSubscription.unsubscribe() : _.noop;
		this.linkConnectSubscription = null;

		// Stop retrying
		this.linkRetrySubscription ? this.linkRetrySubscription.unsubscribe() : _.noop;
		this.linkRetrySubscription = null;

		// Listen for the socket close
		this.linkCloseSubscription = this.linkClose$.subscribe(this.linkClosed);

		this.connectHandler ? this.connectHandler() : _.noop;
	};

	private linkClosed = () => {

		console.log(`${this.linkName}: Closed`);

		// Stop listening to the link close event
		this.linkCloseSubscription ? this.linkCloseSubscription.unsubscribe() : _.noop;
		this.linkCloseSubscription = null;

		// Retry the link
		this.linkRetrySubscription = this.linkRetryTimer$.subscribe(this.linkRetry);

		// If no specific disconnect handler, then exit
		if (this.disconnectHandler) {
			this.disconnectHandler();
		} else {
			process.exit(1);
		}
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
		this.socket.destroy();
	}

	public write = (msg: Buffer): boolean => this.socket.write(msg);
}

export const createClient = (linkName, host, port, connectHandler, disconnectHandler = null) =>
	new Promise((resolve) => resolve(new ClientSocket(linkName, host, port, connectHandler, disconnectHandler)));
