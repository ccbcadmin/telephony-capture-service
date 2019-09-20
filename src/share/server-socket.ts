// tslint:disable: indent

export class ServerSocket {

	private net = require("net");
	private server: any;
	private connection: any = null;

	constructor(
		private linkName: string,
		private port: number,
		private dataSink: any,
		private linkCloseHandler: (() => void) | undefined = undefined) {

		this.server = this.net.createServer();

		if (linkCloseHandler) {
			this.server.addListener("close", this.linkCloseHandler);
		}
	}

	private handleConnection = connection => {

		const remoteAddress = connection.remoteAddress + ":" + connection.remotePort;
		console.log(`${this.linkName}: Connection Open: ${remoteAddress}`);

		const onClose = () => {
			console.log(`${this.linkName}: Connection Closed: from ${remoteAddress}`);
			connection.removeListener("data", this.dataSink);
			connection.removeListener("error", onError);
		};

		const onError = err => {
			console.log(`${this.linkName}: Connection ${remoteAddress} error: ${err.message}`);
		};

		connection.addListener("data", this.dataSink);
		connection.prependOnceListener("close", onClose);
		connection.addListener("error", onError);
		this.connection = connection;
	}

	public startListening = () => {

		this.server.addListener("connection", this.handleConnection);

		this.server.listen({
			host: "0.0.0.0",
			port: this.port
		}
			, () => {
				console.log(`${this.linkName}: Listening on: ${this.port}`);
			});
	}

	public stopListening = () => {
		console.log(`${this.linkName}: Stop Listening`);
		this.server.removeListener("connection", this.handleConnection);
		this.server.close();
	}

	// Provide a gracious shutdown of the circuit
	public close = () => {
		if (this.connection) {
			this.connection.end();
			this.connection = null;
		}
		this.stopListening();
	}
}
