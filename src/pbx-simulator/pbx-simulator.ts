#!/usr/bin/env node
// tslint:disable: indent

const routineName = "pbx-simulator";

import _ from "lodash";
import fs from "fs";

import {
	CRLF,
	REGEXP_SMDR_FILENAME
} from "../share/constants";

import { ClientSocket } from "../share/client-socket";

const dir = require("node-dir");
const eventEmitter = require("events").EventEmitter;
const ee = new eventEmitter;

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	TCS_PORT: num(),
	PBX_SIMULATOR_SOURCE_DIRECTORY: str(),
	PBX_SIMULATOR_INPUT_FREQUENCY: num()
});

class PbxSimulator {

	private smdrFiles: string[] = [];
	private smdrFileNo = 0;

	private tcsClient: ClientSocket;

	constructor() {

		ee.addListener("next", this.nextFile);
		this.tcsClient = new ClientSocket("pbx=>tcs", "localhost", env.TCS_PORT, this.sendData);
	}

	private sendSmdrRecords = async (smdrFileName: string): Promise<void> => {

		const data: Buffer = await fs.promises.readFile(smdrFileName);

		process.stdout.write("Sending " + smdrFileName + "  ");

		let index: number = 0;
		let next_index: number = 0;
		let recordCount: number = 0;

		const intervalId = setInterval(() => {
			// Look for SMDR record boundaries until there are no more
			if ((next_index = data.indexOf(CRLF, index)) < 0) {
				process.stdout.write(`\bis complete.  ${recordCount} SMDR records sent.\r\n`);
				clearInterval(intervalId);
				ee.emit("next");
			} else {
				++recordCount;
				const nextMsg = data.slice(index, next_index + 2);
				// process.stdout.write(nextMsg);

				if (recordCount % 20 === 5)
					process.stdout.write("-");
				else if (recordCount % 20 === 10)
					process.stdout.write("\\");
				else if (recordCount % 20 === 15)
					process.stdout.write("|");
				else if (recordCount % 20 === 0)
					process.stdout.write("/");

				index = next_index + 2;

				// Randomly partition socket writes to ensure TCS handles gracefully
				const partition = Math.floor(Math.random() * nextMsg.length);
				const firstPart = nextMsg.slice(0, partition);
				const secondPart = nextMsg.slice(partition);

				if (!this.tcsClient.write(firstPart) || !this.tcsClient.write(secondPart)) {
					console.log("Link to TCS unavailable...aborting.");
					process.exit(1);
				}
			}
		}, env.PBX_SIMULATOR_INPUT_FREQUENCY);
	}

	private nextFile = async () => {
		if (this.smdrFileNo === this.smdrFiles.length) {
			process.exit(0);
		}
		else {
			await this.sendSmdrRecords(this.smdrFiles[this.smdrFileNo]);
			++this.smdrFileNo;
		}
	}

	private sendData = async (): Promise<void> => {

		try {

			const sourceDir = `/smdr-data/${env.PBX_SIMULATOR_SOURCE_DIRECTORY}`;

			// Search the source directory looking for raw SMDR files
			console.log("sourceDir: ", sourceDir);
			const files = await dir.files(sourceDir);

			// Deliver the data in chronological order
			files.sort();

			for (const file of files) {

				const path = file.split("/");

				// Only interested in SMDR files
				if (path[path.length - 1].match(REGEXP_SMDR_FILENAME)) {
					this.smdrFiles.push(file);
				}

				this.nextFile();
			}

		} catch (err) {
			return Promise.reject(err);
		}
	}
}

try {
	new PbxSimulator();
	console.log(`${routineName} Started`);

} catch (err) {
	console.log(err.message);
	process.exit(0);
}


