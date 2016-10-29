export namespace Duplicator {

	const net = require('net');

	const echo1_socket = net.createConnection(9001, '127.0.0.1');
	console.log('Echo 1 Socket created.');

	const echo2_socket = net.createConnection(9002, '127.0.0.1');
	console.log('Echo 2 Socket created.');

	const handleConnection = connection => {
		const remoteAddress = connection.remoteAddress + ':' + connection.remotePort;
		console.log('new client connection from %s', remoteAddress);

		const onConnData = (data: Buffer) => {
			// console.log('connection data from %s: %j', remoteAddress, data);

			console.log('Duplicator: ', data.toString());

			connection.write(data);

			// Duplicate the data
			echo1_socket.write(data);
			echo2_socket.write(data);
			
		}

		const onConnClose = () => {
			console.log('connection from %s closed', remoteAddress);
		}

		const onConnError = err => {
			console.log('Connection %s error: %s', remoteAddress, err.message);
		}

		connection.on('data', onConnData);
		connection.once('close', onConnClose);
		connection.on('error', onConnError);
	}

	const server = net.createServer();
	server.on('connection', handleConnection);

	server.listen(9000, () => {
		console.log('server listening to %j', server.address());
	});

}
