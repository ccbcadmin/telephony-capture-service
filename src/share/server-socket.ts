
import { CRLF } from '../constants';

export class ServerSocket {

	private net = require('net');
	private serverName: string;
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
			console.log(`${this.serverName}: Listening to: ${this.server.address()}`);
		});
	}
	private handleConnection = conn => {

		const remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
		console.log(`${this.serverName}: New client connection from ${remoteAddress}`);

		let leftOver: string = '';
		let recordCount = 0;

		const onData = (data: Buffer) => {

			let unprocessedData = leftOver + data;

			let crLfIndexOf = unprocessedData.indexOf(CRLF);

			const msg = unprocessedData.match(/\x00\x02\x00\x00\x00\x00(.+)\x0d\x0a/);
			if (msg) {
				// Client decides what to do with the data
				this.dataSink(msg[1]);

				leftOver = unprocessedData.slice(crLfIndexOf + 2);
			} else {
				leftOver = unprocessedData.slice(0);
			}
		}

		const onClose = () => {
			console.log(`${this.serverName}: Connection from ${remoteAddress} closed.`);
		}

		const onError = err => {
			console.log(`${this.serverName}: Connection ${remoteAddress} error: ${err.message}`);
		}

		conn.on('data', onData);
		conn.once('close', onClose);
		conn.on('error', onError);
	}
}
