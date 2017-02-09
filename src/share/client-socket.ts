const _ = require('lodash');

export class ClientSocket {

	private net = require('net');
	private linkName: string;
	private host: string;
	private port: number;
	private socket;
	private active: boolean;
	private retryCount = 0;
	private connectHandler;

	constructor(linkName: string, host: string, port: number, connectHandler = null) {
		this.linkName = linkName;
		this.host = host;
		this.port = port;
		this.active = false;
		this.connectHandler = connectHandler;

		this.openSocket();
	}

	private openSocket = () => {
		this.socket = this.net.createConnection({ port: this.port }, this.onConnect);
		this.socket.on('end', () => { console.log('disconnected from server'); });
		this.socket.on('close', () => { console.log('link closed'); });
	}

	private onConnect = () => {
		console.log(`${this.linkName}: Connected`);
		this.retryCount = 0;
		this.active = true;
		this.connectHandler ? this.connectHandler() : _.noop;
	}

	private onClose = socket => {
		setTimeout(this.openSocket, 2000);
	}

	public write = (msg: Buffer): boolean => {

		if (this.active) {
			if (this.socket.write(msg), 'binary') {
				return true;
			}
		}
		return false;
	}

	public destroy = (): void => {
		this.active ? this.socket.destroy() : _.noop;
	}
}
