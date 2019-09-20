#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("../share/queue");
const util_1 = require("../share/util");
const Barrel_1 = require("../Barrel");
const routineName = "test-queuing-no-ack";
const _ = require("lodash");
const moment = require("moment");
Barrel_1.trace(`${routineName}: Started`);
process.on("SIGTERM", () => {
    Barrel_1.trace(`${routineName}: Terminated`);
    process.exit(0);
});
let failModule = 12;
let receiveCount = 0;
const testMsgCount = 60;
let rxMatrix = new Array(testMsgCount);
rxMatrix.fill(false);
let rxQueue;
const dataSink = (msg) => __awaiter(this, void 0, void 0, function* () {
    Barrel_1.trace("Received Msg: ", msg);
    ++receiveCount;
    if (receiveCount % failModule !== 0) {
        rxMatrix[msg[0]] = true;
        return true;
    }
    else {
        rxQueue ? rxQueue.close() : _.noop;
        rxQueue = undefined;
        util_1.sleep(2000).then(() => rxQueue = new queue_1.Queue("TEST_QUEUE", dataSink));
        return false;
    }
});
const msgLength = 40;
rxQueue = new queue_1.Queue("TEST_QUEUE", dataSink);
const txQueue = new queue_1.Queue("TEST_QUEUE");
util_1.sleep(2000)
    .then(() => txQueue.purge())
    .then(() => {
    for (let i = 0; i < testMsgCount; ++i) {
        let sendBuffer = Buffer.alloc(msgLength);
        for (let j = 0; j < msgLength; ++j) {
            sendBuffer[j] = i;
        }
        txQueue.sendToQueue(sendBuffer);
    }
})
    .catch((err) => { Barrel_1.trace('Err: ', JSON.stringify(err, null, 4)); });
util_1.sleep(30000)
    .then(() => {
    let recheckCounter = 0;
    setInterval(() => {
        Barrel_1.trace("Check If All Messages Received");
        let allReceived = true;
        for (let i = 0; i < testMsgCount; ++i) {
            if (rxMatrix[i] !== true) {
                allReceived = false;
                break;
            }
        }
        if (allReceived === true) {
            Barrel_1.trace("All Messages Received");
            process.exit(0);
        }
        if (18 < ++recheckCounter) {
            Barrel_1.trace(`Not All Messages Received`);
            process.exit(1);
        }
    }, 5000);
});
