#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../share/constants");
const server_socket_1 = require("../share/server-socket");
const queue_1 = require("../share/queue");
const moment_1 = __importDefault(require("moment"));
const assert_1 = __importDefault(require("assert"));
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const Barrel_1 = require("../Barrel");
const envalid = require("envalid");
const { str, num } = envalid;
const routineName = "pbx-interface";
class PbxInterface extends Barrel_1.Process {
    constructor() {
        super({ routineName });
        this.leftOver = Buffer.alloc(0);
        this.env = envalid.cleanEnv(process.env, {
            TMS_ACTIVE: num(),
            TCS_PORT: num(),
            DB_QUEUE: str(),
            TMS_QUEUE: str()
        });
        this.parseSmdrMessages = (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const unprocessedData = Buffer.concat([this.leftOver, data], this.leftOver.length + data.length);
                let nextMsg = 0;
                let crLfIndexOf = unprocessedData.indexOf(constants_1.CRLF, nextMsg);
                while (0 <= crLfIndexOf) {
                    const smdrMessage = unprocessedData.slice(nextMsg, crLfIndexOf + 2);
                    if (smdrMessage.indexOf("20") === 0) {
                        this.databaseQueue ?
                            this.databaseQueue
                                .sendToQueue(unprocessedData.slice(nextMsg, crLfIndexOf)) :
                            lodash_1.default.noop;
                        yield fs_1.default.promises.appendFile("/smdr-data/smdr-data-001/rw" + moment_1.default().format("YYMMDD") + ".001", smdrMessage);
                    }
                    else {
                        Barrel_1.logDebug("Corrupt message detected:\n", smdrMessage.toString());
                    }
                    nextMsg = crLfIndexOf + 2;
                    crLfIndexOf = unprocessedData.indexOf(constants_1.CRLF, nextMsg);
                }
                if (nextMsg < unprocessedData.length) {
                    this.leftOver = Buffer.alloc(unprocessedData.length - nextMsg);
                    unprocessedData.copy(this.leftOver, 0, nextMsg);
                }
                else {
                    this.leftOver = Buffer.alloc(0);
                }
            }
            catch (err) {
                return Promise.reject(err);
            }
        });
        this.dataSink = (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                this.tmsQueue ? this.tmsQueue.sendToQueue(data) : lodash_1.default.noop;
                yield this.parseSmdrMessages(data);
            }
            catch (err) {
                Barrel_1.logError(err.message);
            }
        });
        this.pbxLinkClosed = () => {
            Barrel_1.logError("pbx=>pbx-interface Link Closed");
        };
        this.tmsQueueDisconnectHandler = () => {
            Barrel_1.logError(`${this.env.TMS_QUEUE} Channel Down`);
        };
        this.dbQueueConnectHandler = () => {
            Barrel_1.debugTcs("dbQueueConnectHandler()");
            this.pbxSocket ? this.pbxSocket.startListening() : lodash_1.default.noop;
            Barrel_1.logError(`${this.env.DB_QUEUE} Channel Up`);
        };
        this.dbQueueDisconnectHandler = () => {
            Barrel_1.logError(`${this.env.DB_QUEUE} Down`);
            this.pbxSocket ? this.pbxSocket.close() : lodash_1.default.noop;
        };
        try {
            const { TMS_ACTIVE, DB_QUEUE, TMS_QUEUE, TCS_PORT, } = this.env;
            !TMS_ACTIVE || (this.tmsQueue = new queue_1.Queue({
                queueName: TMS_QUEUE,
                disconnectHandler: this.tmsQueueDisconnectHandler,
            }));
            Barrel_1.debugTcs(`(${routineName}) TMS_QUEUE Started`);
            this.databaseQueue = new queue_1.Queue({
                queueName: DB_QUEUE,
                disconnectHandler: this.dbQueueDisconnectHandler,
                connectHandler: this.dbQueueConnectHandler,
            });
            Barrel_1.debugTcs(`(${routineName}) DB_QUEUE Started`);
            this.pbxSocket = new server_socket_1.ServerSocket({
                linkName: "pbx=>tcs",
                port: TCS_PORT,
                dataSink: this.dataSink,
                disconnectHandler: this.pbxLinkClosed
            });
            Barrel_1.debugTcs(`(${routineName}) Constructor Complete`);
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        assert_1.default((yield fs_1.default.promises.stat("/smdr-data/smdr-data-001")).isDirectory(), `Directory /smdr-data/smdr-data-001 Not Found`);
        new PbxInterface();
        Barrel_1.logInfo(`(${routineName}) Started`);
    }
    catch (err) {
        Barrel_1.logError(err.message);
        process.exit(0);
    }
}))().catch(err => Barrel_1.logFatal(err));
