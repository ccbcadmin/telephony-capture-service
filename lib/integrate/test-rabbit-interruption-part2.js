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
const server_socket_1 = require("../share/server-socket");
const util_1 = require("../share/util");
const Barrel_1 = require("../Barrel");
const routineName = "test-rabbit-interruption-part2";
const envalid = require("envalid");
const { str, num } = envalid;
const testSize = 100000;
process.on("SIGTERM", () => {
    Barrel_1.debugTcs(`${routineName} terminated`);
    process.exit(0);
});
process.on("SIGINT", () => {
    Barrel_1.debugTcs(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});
const env = envalid.cleanEnv(process.env, {
    TMS_PORT: num()
});
util_1.sleep(30000)
    .then(() => {
    Barrel_1.debugTcs("Insufficient Data Received: ", rxBytes);
    process.exit(1);
});
let rxBytes = 0;
const dataSink = (data) => __awaiter(this, void 0, void 0, function* () {
    rxBytes += data.length;
    if (rxBytes === testSize) {
        Barrel_1.debugTcs("All Data Received");
        process.exit(0);
    }
    else if (rxBytes > testSize) {
        Barrel_1.debugTcs("Excessive Data Received");
        process.exit(1);
    }
});
new server_socket_1.ServerSocket({
    linkName: "tcs=>tms",
    port: env.TMS_PORT,
    dataSink,
}).startListening();
