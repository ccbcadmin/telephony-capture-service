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
const lodash_1 = __importDefault(require("lodash"));
const queue_1 = require("../share/queue");
const util_1 = require("../share/util");
const Barrel_1 = require("../Barrel");
const routineName = "test-queuing-no-ack";
Barrel_1.debugTcs(`${routineName}: Started`);
process.on("SIGTERM", () => {
    Barrel_1.debugTcs(`${routineName}: Terminated`);
    process.exit(0);
});
let failModule = 12;
let receiveCount = 0;
const testMsgCount = 60;
let rxMatrix = new Array(testMsgCount);
rxMatrix.fill(false);
let rxQueue;
const dataSink = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    Barrel_1.debugTcs("Received Msg: ", msg);
    ++receiveCount;
    if (receiveCount % failModule !== 0) {
        rxMatrix[msg.content[0]] = true;
        return true;
    }
    else {
        rxQueue ? rxQueue.close() : lodash_1.default.noop;
        rxQueue = undefined;
        yield Barrel_1.setTimeoutPromise(2000);
        rxQueue = new queue_1.Queue({ queueName: "TEST_QUEUE", consumer: dataSink });
        return false;
    }
});
const msgLength = 40;
rxQueue = new queue_1.Queue({ queueName: "TEST_QUEUE", consumer: dataSink });
const txQueue = new queue_1.Queue({ queueName: "TEST_QUEUE" });
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
    .catch((err) => { Barrel_1.debugTcs("Err: ", JSON.stringify(err, null, 4)); });
util_1.sleep(30000)
    .then(() => {
    let recheckCounter = 0;
    setInterval(() => {
        Barrel_1.debugTcs("Check If All Messages Received");
        let allReceived = true;
        for (let i = 0; i < testMsgCount; ++i) {
            if (rxMatrix[i] !== true) {
                allReceived = false;
                break;
            }
        }
        if (allReceived === true) {
            Barrel_1.debugTcs("All Messages Received");
            process.exit(0);
        }
        if (18 < ++recheckCounter) {
            Barrel_1.debugTcs(`Not All Messages Received`);
            process.exit(1);
        }
    }, 5000);
});
