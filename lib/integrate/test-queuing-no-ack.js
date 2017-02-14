#!/usr/bin/env node
"use strict";
const queue_1 = require("../share/queue");
require("rxjs/Rx");
const routineName = "test-queuing-no-ack";
const _ = require("lodash");
const moment = require("moment");
console.log(`${routineName}: Started`);
process.on("SIGTERM", () => {
    console.log(`${routineName}: Terminated`);
    process.exit(0);
});
let failModule = 12;
let receiveCount = 0;
const testMsgCount = 60;
let rxMatrix = new Array(testMsgCount);
rxMatrix.fill(false);
const dataSink = msg => {
    console.log("Received Msg: ", msg);
    ++receiveCount;
    if (receiveCount % failModule !== 0) {
        rxMatrix[msg[0]] = true;
        return true;
    }
    else {
        rxQueue.close();
        rxQueue = null;
        setTimeout(() => {
            rxQueue = new queue_1.Queue("TEST_QUEUE", null, dataSink, null);
        }, 2000);
        return false;
    }
};
let rxQueue;
let txQueue = new queue_1.Queue("TEST_QUEUE", null, null, null);
const msgLength = 40;
rxQueue = new queue_1.Queue("TEST_QUEUE", null, dataSink, null);
setTimeout(() => {
    txQueue.purge();
    for (let i = 0; i < testMsgCount; ++i) {
        let sendBuffer = Buffer.alloc(msgLength);
        for (let j = 0; j < msgLength; ++j) {
            sendBuffer[j] = i;
        }
        txQueue.sendToQueue(sendBuffer);
    }
}, 1000);
setTimeout(() => {
    let recheckCounter = 0;
    setInterval(() => {
        console.log("Check If All Messages Received");
        let allReceived = true;
        for (let i = 0; i < testMsgCount; ++i) {
            if (rxMatrix[i] !== true) {
                allReceived = false;
                break;
            }
        }
        if (allReceived === true) {
            console.log("All Messages Received");
            process.exit(0);
        }
        if (12 < ++recheckCounter) {
            console.log(`Not All Messages Received`);
            process.exit(1);
        }
    }, 5000);
}, 60000);
