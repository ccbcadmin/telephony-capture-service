#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../share/constants");
const server_socket_1 = require("../share/server-socket");
const queue_1 = require("../share/queue");
const moment_1 = __importDefault(require("moment"));
const lodash_1 = __importDefault(require("lodash"));
const fs = require("fs");
const routineName = "pbx-interface";
console.log(`Restarting ${routineName}`);
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TMS_ACTIVE: num(),
    TCS_PORT: num(),
    DB_QUEUE: str(),
    TMS_QUEUE: str()
});
process.on("SIGTERM", () => {
    pbxSocket.close();
    console.log("TCS Terminated (SIGTERM)");
});
let tmsQueue;
let databaseQueue;
let leftOver = Buffer.alloc(0);
const parseSmdrMessages = (data) => {
    let unprocessedData = Buffer.concat([leftOver, data], leftOver.length + data.length);
    let nextMsg = 0;
    let crLfIndexOf = unprocessedData.indexOf(constants_1.CRLF, nextMsg);
    while (0 <= crLfIndexOf) {
        const smdrMessage = unprocessedData.slice(nextMsg, crLfIndexOf + 2);
        if (smdrMessage.indexOf("20") === 0) {
            databaseQueue ?
                databaseQueue.sendToQueue(unprocessedData.slice(nextMsg, crLfIndexOf)) :
                lodash_1.default.noop;
            fs.appendFile("/smdr-data/smdr-data-001/rw" + moment_1.default().format("YYMMDD") + ".001", smdrMessage, (err) => {
                if (err)
                    throw err;
            });
        }
        else {
            console.log('Corrupt message detected:\n', smdrMessage.toString());
        }
        nextMsg = crLfIndexOf + 2;
        crLfIndexOf = unprocessedData.indexOf(constants_1.CRLF, nextMsg);
    }
    if (nextMsg < unprocessedData.length) {
        leftOver = Buffer.alloc(unprocessedData.length - nextMsg);
        unprocessedData.copy(leftOver, 0, nextMsg);
    }
    else {
        leftOver = Buffer.alloc(0);
    }
};
const dataSink = (data) => {
    tmsQueue ? tmsQueue.sendToQueue(data) : lodash_1.default.noop;
    parseSmdrMessages(data);
};
const pbxLinkClosed = () => {
    console.log("pbx=>pbx-interface Link Closed");
};
const tmsQueueDisconnectHandler = () => {
    console.log(`${env.TMS_QUEUE} Channel Down`);
};
const dbQueueConnectHandler = () => {
    pbxSocket.startListening();
    console.log(`${env.DB_QUEUE} Channel Up`);
};
const dbQueueDisconnectHandler = () => {
    console.log(`${env.DB_QUEUE} Down`);
    pbxSocket.close();
};
tmsQueue = env.TMS_ACTIVE ? new queue_1.Queue(env.TMS_QUEUE, undefined, tmsQueueDisconnectHandler) : undefined;
databaseQueue = new queue_1.Queue(env.DB_QUEUE, undefined, dbQueueDisconnectHandler, dbQueueConnectHandler);
const pbxSocket = new server_socket_1.ServerSocket("pbx=>tcs", env.TCS_PORT, dataSink, pbxLinkClosed);
