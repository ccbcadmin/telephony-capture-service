#!/usr/bin/env node
// tslint:disable: indent

import {
	CRLF,
	REGEXP_SMDR_FILENAME
} from "../share/constants";
import { ClientSocket, createClient } from "../share/client-socket";
import { sleep } from "../share/util";

import _ from "lodash";
import fs from "fs";
import dir from "node-dir";
const net = require("net");
import { EventEmitter } from "events";
const ee = new EventEmitter();
const path = require("path");
const testName = path.basename(__filename).split(".")[0];

console.log(`\nTest Case: ${testName}`);

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;

const env = envalid.cleanEnv(process.env, {
	TCS_PORT: num(),
	TEST_TRANSMIT_INTERVAL: num(),
	DATABASE: str(),
});

let smdrFiles: string[] = [];
let smdrFileNo = 0;

let tcsClient: ClientSocket;

let txBuffer = Buffer.alloc(0);
let rxBuffer = Buffer.alloc(0);
let txMsgCount = 0;
let rxMsgCount = 0;

const sendSmdrRecords = (data: Buffer, transmitInterval: number): void => {

	let index: number = 0;
	let next_index: number = 0;

	const intervalId = setInterval(() => {
		// Look for SMDR record boundaries until there are no more
		if ((next_index = data.indexOf(CRLF, index)) < 0) {
			process.stdout.write(`\bis complete.  ${txMsgCount} SMDR records sent.\r\n`);
			clearInterval(intervalId);
			ee.emit("next");
		} else {
			++txMsgCount;
			const nextMsg = data.slice(index, next_index + 2);

			index = next_index + 2;

			// Randomly partition socket writes to ensure TCS handles gracefully
			const partition = Math.floor(Math.random() * nextMsg.length);
			const firstPart = nextMsg.slice(0, partition);
			const secondPart = nextMsg.slice(partition);

			if (!tcsClient.write(firstPart) || !tcsClient.write(secondPart)) {
				console.log("pbx=>tcs: Unavailable");
				process.exit(1);
			}
		}
	}, transmitInterval);
};

const compareFiles = async () => {

	try {

		console.log("Compare Files");

		const files = await dir.promiseFiles("/smdr-data/smdr-data-001");

		if (files.length !== 1) {
			console.log("Exactly One SMDR-DATA-001 file expected");
			process.exit(1);
		}

		console.log("filename: ", files[0]);

		const data = await fs.promises.readFile(files[0]);

		console.log("Length of data: ", data.length);

		// Accummulate all the data into one buffer
		rxBuffer = Buffer.concat([rxBuffer, data], rxBuffer.length + data.length);

		console.log("result: ", txBuffer.length, rxBuffer.length);

		if (Buffer.compare(txBuffer, rxBuffer) === 0) {
			console.log("Source Files and Target Files are identical");
			process.exit(0);
		} else {

			console.log("Source Files and Target Files differ");

			// Scan the received file data looking for LF chars
			for (let i = 0; i < rxBuffer.length; ++i) {
				if (rxBuffer[i] === 10) {
					++rxMsgCount;
				}
			}

			if (rxMsgCount === txMsgCount) {
				console.log("Msg Counts are Identical", txMsgCount, rxMsgCount);
			} else {
				console.log("Msg Counts are Not Identical", txMsgCount, rxMsgCount);
			}

			process.exit(1);
		}
	} catch (err) {
		console.log(err);
		process.exit(1);
	}
};

const nextFile = async () => {

	if (smdrFileNo === smdrFiles.length) {

		// Wait a bit and then confirm the count in the database
		await sleep(1000);
		await compareFiles();
	}
	else {

		console.log("Sending: " + smdrFiles[smdrFileNo]);
		txBuffer = fs.readFileSync(smdrFiles[smdrFileNo]);
		sendSmdrRecords(txBuffer, env.TEST_TRANSMIT_INTERVAL);
		++smdrFileNo;
	}
};

ee.on("next", nextFile);

// Delete all files out of the SMDR-DATA-001 directory
const clearSMDR_DATA_001 = () => new Promise((resolve, reject) => {

	dir.files(
		"/smdr-data/smdr-data-001",

		(error: Error, files: Array<string>) => {

			if (error) {
				console.log(JSON.stringify(error, null, 4));
				// process.exit(1);
				return reject(error);
			}

			files.forEach(file => {
				fs.unlink(file, (error: Error) => {
					if (error) {
						console.log(JSON.stringify(error, null, 4));
						process.exit(1);
					}
				});
			});
			resolve(null);
		});
});

const sendData = () => {
	// Search the source directory looking for raw SMDR files
	dir.files(
		"./sample-data/smdr-data/smdr-one-file",
		(error: Error, files: Array<string>) => {

			if (error) {
				console.log(JSON.stringify(error, null, 4));
				process.exit(1);
			}
			else if (files.length !== 1) {
				console.log("Only one file expected");
				process.exit(1);
			}

			let path = files[0].split("/");

			// Only interested in SMDR files
			if (path[path.length - 1].match(REGEXP_SMDR_FILENAME)) {
				smdrFiles.push(files[0]);
			} else {
				console.log("Not an SMRD File");
				process.exit(1);
			}
			nextFile();
		});
};

// Wait a bit to ensure SMDR-DATA-001 has been cleared
sleep(4000)
	.then(clearSMDR_DATA_001)
	.then(() => createClient("pbx=>tcs", "localhost", env.TCS_PORT, sendData))
	.then((client: ClientSocket) => tcsClient = client)
	.catch((err) => { console.log("Err: ", JSON.stringify(err, null, 4)); });
