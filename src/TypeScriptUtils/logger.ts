// tslint:disable
import moment from 'moment';
import _ from 'lodash';
import {
	trace
} from "./debug";
const bunyan = require('bunyan');
const luvely = require('luvely');
const cloudWatch = require('bunyan-cloudwatch');

export interface ConsoleConfig {
    enable: boolean;
    logLevel: string;
}

export interface CloudWatchConfig {
    enable: boolean,
    logLevel: string
}

export interface LogConfigRecord {
    console: ConsoleConfig;
    cloudWatch: CloudWatchConfig;
}

export class Logger {

	public static process: Logger | undefined;
	public static logGroupName: string = "Operations";

	constructor(
		private logStreamName: string,
		private logConfig: LogConfigRecord | undefined = undefined) {

		trace({
			logGroupName: Logger.logGroupName,
			logStreamName,
			logConfig
		});

		if (logConfig) {

			logConfig.console.enable ?
				this.logger.addStream(this.consoleStream(logConfig.console)) :
				_.noop;
			logConfig.cloudWatch.enable ?
				this.logger.addStream(this.cloudWatchStream(logConfig.cloudWatch)) :
				_.noop;
		}
	}

	public trace = (...args: Array<any>) => this.logger.trace(...args);
	public debug = (...args: Array<any>) => this.logger.debug(...args);
	public info = (...args: Array<any>) => this.logger.info(...args);
	public warn = (...args: Array<any>) => this.logger.warn(...args);
	public error = (...args: Array<any>) => this.logger.error(...args);
	public fatal = (...args: Array<any>) => this.logger.fatal(...args);

	private logger = bunyan.createLogger({ name: 'hft', level: 61 });

	private consoleStream = (config: ConsoleConfig) => ({

		name: 'Console',
		// If in UI mode, then no messages to the screen - unless fatal
		level: config.logLevel,
		stream: luvely()   
	});

	private cloudWatchStream = (config: CloudWatchConfig) => ({

		name: 'CloudWatch',
		type: 'raw',
		level: config.logLevel,
		stream: new cloudWatch({
			logGroupName: Logger.logGroupName,
			logStreamName: this.logStreamName,
			cloudWatchLogsOptions: {
				region: "us-west-2"
			}
		}),
	});
}

enum LogLevel {
	Fatal = bunyan.FATAL,
	Error = bunyan.ERROR,
	Warn = bunyan.WARN,
	Info = bunyan.INFO,
	Debug = bunyan.DEBUG,
	Trace = bunyan.TRACE,
}

const log = (logLevel: LogLevel, msg: string, errObj: any | undefined = undefined) => {

	if (Logger.process != null) {

		let logLevelHandler: any = undefined;

		switch (logLevel) {

			case LogLevel.Fatal:
				logLevelHandler = Logger.process.fatal;
				break;
			case LogLevel.Error:
				logLevelHandler = Logger.process.error;
				break;
			case LogLevel.Warn:
				logLevelHandler = Logger.process.warn;
				break;
			case LogLevel.Info:
				logLevelHandler = Logger.process.info;
				break;
			case LogLevel.Debug:
				logLevelHandler = Logger.process.debug;
				break;
			case LogLevel.Trace:
				logLevelHandler = Logger.process.trace;
				break;
		}

		_.isEmpty(errObj) ?
			logLevelHandler(msg) :
			logLevelHandler(msg, errObj);

	} else {
		if (errObj) {
			console.log(`Logger: ${msg}\n${JSON.stringify(errObj, null, 4)}`);
		} else {
			console.log(`Logger: ${msg}`);
		}
	}
}

export const logFatal = (msg: string, errObj: any = undefined): void => {
	log(LogLevel.Fatal, msg, errObj);
}

export const logError = (msg: string, errObj: any = undefined): void => {

	//console.log ({msg, errObj});
	log(LogLevel.Error, msg, errObj);
}

export const logWarn = (msg: string, errObj: any = undefined): void => {
	log(LogLevel.Warn, msg, errObj);
}

export const logInfo = (msg: string, errObj: any = undefined): void => {
	log(LogLevel.Info, msg, errObj);
}

export const logDebug = (msg: string, errObj: any = undefined): void => {
	log(LogLevel.Debug, msg, errObj);
}

export const logTrace = (msg: string, errObj: any = undefined): void => {
	log(LogLevel.Trace, msg, errObj);
}

