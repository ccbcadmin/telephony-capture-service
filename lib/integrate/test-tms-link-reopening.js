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
Object.defineProperty(exports, "__esModule", { value: true });
const client_socket_1 = require("../share/client-socket");
const server_socket_1 = require("../share/server-socket");
const queue_1 = require("../share/queue");
const util_1 = require("../share/util");
const routineName = "test-tms-link-reopening";
const envalid = require("envalid");
const { str, num } = envalid;
process.on("SIGTERM", () => {
    console.log(`${routineName} terminated`);
    process.exit(0);
});
process.on("SIGINT", () => {
    console.log(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});
const env = envalid.cleanEnv(process.env, {
    TCS_PORT: num(),
    TEST_TRANSMIT_INTERVAL: num(),
    TMS_PORT: num(),
    TMS_QUEUE: str()
});
let tcsClient;
const nextChar = (c) => {
    return String.fromCharCode(c.charCodeAt(0) + 1);
};
let testChar = " ";
const sendData = () => {
    const setIntervalId = setInterval(() => {
        const dataLength = 40;
        let data = Buffer.alloc(dataLength);
        data.fill(testChar);
        testChar = nextChar(testChar);
        console.log("data sent: ", data);
        if (tcsClient.write(data) === false) {
            console.log("Link to TCS unavailable ... aborting.");
            process.exit(1);
        }
    }, 1000);
};
const tmsQueue = new queue_1.Queue(env.TMS_QUEUE);
util_1.sleep(2000)
    .then(tmsQueue.purge)
    .then(() => tcsClient =
    new client_socket_1.ClientSocket({
        linkName: "pbx=>tcs",
        host: "localhost",
        port: env.TCS_PORT,
        connectHandler: sendData
    }))
    .catch((err) => { console.log("Err: ", JSON.stringify(err, null, 4)); });
const startListening = () => { tmsServer.startListening(); };
const testSize = 100;
let rxMatrix = Buffer.alloc(testSize);
rxMatrix.fill(0);
const dataSink = (data) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(data);
    for (let j = 0; j < testSize; ++j) {
        for (let k = 0; k < data.length; ++k) {
            if (data[k] === j) {
                rxMatrix[j] = 1;
                break;
            }
        }
    }
    let allReceived = true;
    for (let i = 0; i < testSize; ++i) {
        if (!rxMatrix[i]) {
            allReceived = false;
        }
    }
    if (allReceived) {
        process.exit(0);
    }
    else {
        tmsServer.close();
    }
});
const tmsServer = new server_socket_1.ServerSocket({
    linkName: "tcs=>tms",
    port: env.TMS_PORT,
    dataSink,
    disconnectHandler: startListening
});
startListening();
util_1.sleep(150000).then(() => {
    console.log("Test Failed: Max time to complete test");
    process.exit(1);
});
