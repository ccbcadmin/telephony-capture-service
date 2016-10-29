#!/usr/bin/env node

import { CRLF, SMDR_PREAMBLE, SMDR_QUEUE } from './constants';
import { ClientSocket } from './share/client-socket';
import { Queue } from './share/queue';

export namespace LegacyCallMananagementInterface {

	const amqp = require('amqplib/callback_api');
	const _ = require('lodash');
	const net = require('net');
	const routineName = 'Legacy Call Management Inteface';
	const HOST = '127.0.0.1';
	const CRLF = '\r\n';


	console.log(`${routineName}: Started`);

	process.on('SIGTERM', () => {
		console.log(`${routineName}: Terminated`);
		process.exit(0);
	});

	const clientSocket = new ClientSocket('LCMSIM<=>LCM', '127.0.0.1', 9002);

	const dataSink = msg =>
		clientSocket.write(SMDR_PREAMBLE + msg.content.toString() + CRLF);

	const smdrQueue = new Queue(SMDR_QUEUE, dataSink);
}

/*
	let messageCounter = 0;
	amqp.connect('amqp://192.168.99.100:32772', (err, conn) => {

		if (err) {
			console.log(err); process.exit(0);
		}
		else {
			conn.createChannel((err, channel) => {

				channel.assertQueue(SMDR_QUEUE, { durable: true });
				channel.consume(SMDR_QUEUE, msg => {

					++messageCounter;
					//console.log(`${messageCounter}: ${msg.content.toString()}`);

					// Ack or Nack depending on the success of the trasmission
					clientSocket.write(SMDR_PREAMBLE + msg.content.toString() + CRLF) ? channel.ack(msg) : channel.nack(msg);

				}, { noAck: false });
			});
		}
	});
*/
