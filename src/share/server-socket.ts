export class ServerSocket {

	private net = require('net');
	private serverName: string;
	private host: string;
	private port: number;
	private server: any;
	private dataSink: any; // Place to direct incoming data

	constructor(serverName, port, dataSink) {
		this.serverName = serverName;
		this.port = port;
		this.dataSink = dataSink;

		this.server = this.net.createServer();
		this.server.on('connection', this.handleConnection);

		this.server.listen(this.port, () => {
			console.log(`${this.serverName}: Listening on: ${JSON.stringify(this.server.address())}`);
		});
	}

	private handleConnection = conn => {

		const remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
		console.log(`${this.serverName}: New client connection from ${remoteAddress}`);

		const onClose = () => {
			console.log(`${this.serverName}: Connection from ${remoteAddress} closed.`);
		}

		const onError = err => {
			console.log(`${this.serverName}: Connection ${remoteAddress} error: ${err.message}`);
		}

		conn.on('data', this.dataSink);
		conn.once('close', onClose);
		conn.on('error', onError);
	}
}
