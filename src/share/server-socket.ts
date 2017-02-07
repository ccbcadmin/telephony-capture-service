export class ServerSocket {

	private net = require('net');
	private serverName: string;
	private host: string;
	private port: number;
	private server: any;
	private dataSink: any; // Place to direct incoming data
	private linkClose;
	private connection = null;

	constructor(serverName, port, dataSink, linkClose = null) {
		this.serverName = serverName;
		this.port = port;
		this.dataSink = dataSink;
		this.linkClose = linkClose;

		this.server = this.net.createServer();
		this.server.on('connection', this.handleConnection);

		if (linkClose) {
			this.server.on('close', this.linkClose);
		}

		this.server.listen(this.port, () => {
			console.log(`${this.serverName}: Listening on: ${JSON.stringify(this.server.address())}`);
		});
	}

	private handleConnection = conn => {

		const remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
		console.log(`${this.serverName}: Connection Open: ${remoteAddress}`);

		const onClose = () => {
			console.log(`${this.serverName}: Connection Closed: from ${remoteAddress}`);
		}

		const onError = err => {
			console.log(`${this.serverName}: Connection ${remoteAddress} error: ${err.message}`);
		}

		conn.on('data', this.dataSink);
		conn.once('close', onClose);
		conn.on('error', onError);
		this.connection = conn;
	}

	// Provide a gracious shutdown of the circuit
	public close = () => {
		this.connection.end();
		this.server.close();
	}
}
