#!/usr/bin/env node
// tslint:disable: indent

import {
	CRLF,
	REGEXP_SMDR_FILENAME
} from "../share/constants";
import { debugTcs } from "../Barrel";

const routineName = "mangle";

const fs = require("fs");
const dir = require("node-dir");

// Ensure the presence of required environment variables
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
	SOURCE_DIRECTORY: str(),
	TARGET_DIRECTORY: str()
});

const sourceDir = `/smdr-data/${env.SOURCE_DIRECTORY}`;
const targetDir = `/smdr-data/${env.TARGET_DIRECTORY}`;

import { EventEmitter } from "events";
const ee = new EventEmitter();

const zeroPad = (num: number, places: number) => {
	const zero = places - num.toString().length + 1;
	return Array(+(zero > 0 && zero)).join("0") + num;
};

let substitutePhoneNumberMap = new Map<string, string>();

const substituteDummyPhoneNumber = (phoneNumber: string): string | undefined => {

	if (phoneNumber.length === 10) {
		if (substitutePhoneNumberMap.has(phoneNumber)) {
			return substitutePhoneNumberMap.get(phoneNumber);
		} else {
			const substitutePhoneNumber = phoneNumber.slice(0, 6) + ("" + Math.random()).substring(2, 6);
			substitutePhoneNumberMap.set(phoneNumber, substitutePhoneNumber);
			return substitutePhoneNumber;
		}
	}
	else if ((phoneNumber.length === 11 && phoneNumber.slice(0, 1) === "1")) {
		if (substitutePhoneNumberMap.has(phoneNumber)) {
			return substitutePhoneNumberMap.get(phoneNumber);
		} else {
			const substitutePhoneNumber = phoneNumber.slice(0, 7) + ("" + Math.random()).substring(2, 6);
			substitutePhoneNumberMap.set(phoneNumber, substitutePhoneNumber);
			return substitutePhoneNumber;
		}
	}
	else {
		return phoneNumber;
	}
};

process.on("SIGTERM", () => {
	debugTcs("Telephony Capture Service: Terminated");
	process.exit(0);
});

process.on("SIGINT", () => {
	debugTcs("Telephony Capture Service: Ctrl-C received. Telephony Capture Service terminating");
	process.exit(0);
});

let smdrFiles: string[] = [];
let smdrFileNo = 0;

const replicateSmdrFile = (smdrFileName: string): void => {

	const data = fs.readFileSync(smdrFileName).toString();

	// Increment the file extension by 1 to get the output file name
	let filePart = smdrFileName.split("/");
	const inputFileNameParts = filePart[filePart.length - 1].split(".");
	const outputFile = `${inputFileNameParts[0]}.${zeroPad(Number(inputFileNameParts[1]) + 1, 3)}`;
	const outputPath = [targetDir, outputFile].join("/");

	process.stdout.write(`Mangling ${smdrFileName} to ${outputPath}: `);

	const fd = fs.openSync(outputPath, "w");

	let recordCount = 0;
	let unknownRecords = 0;
	let index: number = 0;
	let next_index: number = 0;

	while ((next_index = data.indexOf(CRLF, index)) > 0) {

		const smdrMessage = data.slice(index, next_index);
		index = next_index + 2;

		let raw_call = smdrMessage.split(",");

		if (raw_call.length !== 30) {
			++unknownRecords;
		}
		else {
			++recordCount;

			// Substitute for 'Caller'
			raw_call[3] = substituteDummyPhoneNumber(raw_call[3]);

			// Substitute for 'Caller Number'
			raw_call[5] = substituteDummyPhoneNumber(raw_call[5]);

			// Substitute for 'Dialed Number'
			raw_call[6] = substituteDummyPhoneNumber(raw_call[6]);

			// Reconstitute the line
			let testSmdr = raw_call.join(",") + CRLF;
			fs.writeSync(fd, testSmdr);

		}
	}

	process.stdout.write("SMDR Records: " + recordCount + ", Unknown Records: " + unknownRecords + CRLF);

	++smdrFileNo;
	ee.emit("next");
};

const nextFile = () => {
	if (smdrFileNo === smdrFiles.length) {
		debugTcs(`That's All Folks !`);
		process.exit(0);
	}
	else {
		replicateSmdrFile(smdrFiles[smdrFileNo]);
	}
};

ee.on("next", nextFile);

// Search the current directory, if none specified
dir.files(sourceDir, (err: Error, files: Array<string>) => {
	if (err) {
		debugTcs(`Source ${sourceDir} is not a directory...aborting.`);
		process.exit(1);
	}
	files.sort();
	for (let file of files) {
		let path = file.split("/");
		if (path[path.length - 1].match(REGEXP_SMDR_FILENAME)) {
			smdrFiles.push(file);
		}
	}
	nextFile();
});
