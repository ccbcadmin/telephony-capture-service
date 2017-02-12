const _ = require("lodash");

export class ClientSocket {

	private net = require("net");
	private linkName: string;
	private host: string;
	private port: number;
	private socket;
	private active: boolean;
	private connectHandler;

	constructor(linkName: string, host: string, port: number, connectHandler = null) {
		this.linkName = linkName;
		this.host = host;
		this.port = port;
		this.active = false;

		// Allows ClientSocket to inform the client that a connection has been established
		this.connectHandler = connectHandler;

		this.openSocket();
	}

	private openSocket = () => {
		this.socket = this.net.createConnection({ port: this.port }, this.onConnect);
		this.socket.addListener("end", () => { console.log(`${this.linkName} Disconnected`); });
		this.socket.addListener("close", () => { console.log(`${this.linkName} Closed`); });
		this.socket.addListener("error", (error) => {
			console.log(`${this.linkName} Link Error:\n${JSON.stringify(error, null, 4)}`);
		});
	}

	private onConnect = () => {
		console.log(`${this.linkName}: Connected`);
		this.active = true;
		this.connectHandler ? this.connectHandler() : _.noop;
	}

	private onClose = socket => {
		setTimeout(this.openSocket, 2000);
	}

	public write = (msg: Buffer): boolean => {

		if (this.active) {
			if (this.socket.write(msg)) {
				return true;
			}
		}
		return false;
	}

	public destroy = (): void => {
		this.active ? this.socket.destroy() : _.noop;
	}
}
