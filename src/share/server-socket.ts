import { debugTcs } from "../Barrel";

// tslint:disable: indent



export class ServerSocket {

	private net = require("net");
	private server: any;
	private connection: any = null;

	constructor(private params: {
		linkName: string;
		port: number;
		dataSink: ((Buffer: Buffer) => Promise<void>);
		disconnectHandler?: (() => void),
	}) {

		this.server = this.net.createServer();

		if (this.params.disconnectHandler) {
			this.server.addListener("close", this.params.disconnectHandler);
		}
	}

	private handleConnection = (connection: any) => {

		const { dataSink, linkName } = this.params;

		const remoteAddress = connection.remoteAddress + ":" + connection.remotePort;
		debugTcs(`${linkName}: Connection Open: ${remoteAddress}`);

		const onClose = () => {
			debugTcs(`${linkName}: Connection Closed: from ${remoteAddress}`);
			connection.removeListener("data", dataSink);
			connection.removeListener("error", onError);
		};

		const onError = (err: Error) => {
			debugTcs(`${this.params.linkName}: Connection ${remoteAddress} error: ${err.message}`);
		};

		connection.addListener("data", dataSink);
		connection.prependOnceListener("close", onClose);
		connection.addListener("error", onError);
		this.connection = connection;
	}

	public startListening = () => {

		const { port, linkName } = this.params;

		this.server.addListener("connection", this.handleConnection);

		this.server.listen(
			{
				host: "0.0.0.0",
				port
			},
			() => {
				debugTcs(`${linkName}: Listening on: ${port}`);
			});
	}

	public stopListening = () => {
		debugTcs(`${this.params.linkName}: Stop Listening`);
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
