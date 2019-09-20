// tslint:disable: indent

import moment from "moment";
import _ from "lodash";
import { validator } from "./validator";

export type ConsoleConfig = {
	enable: boolean,
	logLevel: string
}

export type CloudWatchConfig = {
	enable: boolean,
	logGroupName: string,
	logStreamName: string,
	logLevel: string
}

export type LogConfigRecord = {
	console: ConsoleConfig,
	cloudWatch: CloudWatchConfig
}

const Ajv = require("ajv");

const schema = {

	"type": "object",
	"properties": {
		"console": {
			"type": "object",
			"properties": {
				"enable": {
					"type": "boolean",
					"default": true,
				},
				"logLevel": {
					"enum": ["trace", "debug", "info", "warn", "error", "fatal"],
					"default": "warn"
				},
			},
			"required": ["enable", "logLevel"]
		},
		"cloudWatch": {
			"type": "object",
			"properties": {
				"enable": {
					"type": "boolean",
					"default": true,
				},
				"logLevel": {
					"enum": ["trace", "debug", "info", "warn", "error", "fatal"],
					"default": "trace"
				},
				"logGroupName": {
					"type": "string"
				},
				"logStreamName": {
					"type": "string"
				}
			},
			"required": ["enable", "logLevel", "logGroupName", "logStreamName"]
		}
	},
	"required": ["console", "cloudWatch"]
}

export class LogConfig {

	public static get = async (collection: any): Promise<LogConfigRecord> => {

		try {
			const logConfig = await collection.findOne({}) as LogConfigRecord;

			validator(schema, logConfig);

			return logConfig;

		} catch (err) {
			throw err;
		}
	}
}
