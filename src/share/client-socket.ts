export class ClientSocket {

	private net = require('net');
	private linkName: string;
	private host: string;
	private port: number;
	private socket;
	private active: boolean;

	constructor(linkName: string, host: string, port: number) {
		this.linkName = linkName;
		this.host = host;
		this.port = port;
		this.active = false;

		this.openSocket();
	}

	private openSocket = () => {
		//console.log(`${this.linkName}: Retrying...`);
		this.socket = this.net.connect(this.port, this.host);
		this.socket.setKeepAlive(true);
		this.socket.on('connect', this.onConnect.bind({}, this.socket));
		this.socket.on('error', this.onError.bind({}, this.socket));
	}

	private onConnect = (socket) => {
		console.log(`${this.linkName}: Open!`);
		this.active = true;
	}

	private onError = (socket) => {

		console.log(`${this.linkName}: Failure!`);

		// Kill socket
		this.socket.destroy();
		this.socket.unref();

		// Wait a bit and then retry
		setTimeout(this.openSocket, 2000);
	}

	public write = (msg: string): boolean => {
		if (this.active) {
			return this.active = this.socket.write(msg);
		}
		else {
			return false;
		}
	}
}
