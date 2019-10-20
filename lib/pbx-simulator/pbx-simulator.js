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
const routineName = "pbx-simulator";
const fs_1 = __importDefault(require("fs"));
const node_dir_1 = __importDefault(require("node-dir"));
const constants_1 = require("../share/constants");
const client_socket_1 = require("../share/client-socket");
const Barrel_1 = require("../Barrel");
const events_1 = require("events");
const ee = new events_1.EventEmitter();
const envalid = require("envalid");
const { str, num } = envalid;
class PbxSimulator extends Barrel_1.Process {
    constructor() {
        super({ routineName });
        this.smdrFiles = [];
        this.smdrFileNo = 0;
        this.env = envalid.cleanEnv(process.env, {
            TCS_PORT: num(),
            PBX_SIMULATOR_SOURCE_DIRECTORY: str(),
            PBX_SIMULATOR_INPUT_FREQUENCY: num()
        });
        this.sendSmdrRecords = (smdrFileName) => __awaiter(this, void 0, void 0, function* () {
            const data = yield fs_1.default.promises.readFile(smdrFileName);
            process.stdout.write("Sending " + smdrFileName + "  ");
            let index = 0;
            let next_index = 0;
            let recordCount = 0;
            const intervalId = setInterval(() => {
                if ((next_index = data.indexOf(constants_1.CRLF, index)) < 0) {
                    process.stdout.write(`\bis complete.  ${recordCount} SMDR records sent.\r\n`);
                    clearInterval(intervalId);
                    ee.emit("next");
                }
                else {
                    ++recordCount;
                    const nextMsg = data.slice(index, next_index + 2);
                    if (recordCount % 20 === 5)
                        process.stdout.write("-");
                    else if (recordCount % 20 === 10)
                        process.stdout.write("\\");
                    else if (recordCount % 20 === 15)
                        process.stdout.write("|");
                    else if (recordCount % 20 === 0)
                        process.stdout.write("/");
                    index = next_index + 2;
                    const partition = Math.floor(Math.random() * nextMsg.length);
                    const firstPart = nextMsg.slice(0, partition);
                    const secondPart = nextMsg.slice(partition);
                    if (!this.tcsClient.write(firstPart) || !this.tcsClient.write(secondPart)) {
                        Barrel_1.logFatal("Link to TCS unavailable...aborting.");
                        process.exit(1);
                    }
                }
            }, this.env.PBX_SIMULATOR_INPUT_FREQUENCY);
        });
        this.nextFile = () => __awaiter(this, void 0, void 0, function* () {
            if (this.smdrFileNo === this.smdrFiles.length) {
                process.exit(0);
            }
            else {
                yield this.sendSmdrRecords(this.smdrFiles[this.smdrFileNo]);
                ++this.smdrFileNo;
            }
        });
        this.sendData = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const sourceDir = `/smdr-data/${this.env.PBX_SIMULATOR_SOURCE_DIRECTORY}`;
                Barrel_1.logInfo("sourceDir: ", sourceDir);
                const files = yield node_dir_1.default.promiseFiles(sourceDir);
                files.sort();
                for (const file of files) {
                    const path = file.split("/");
                    if (path[path.length - 1].match(constants_1.REGEXP_SMDR_FILENAME)) {
                        this.smdrFiles.push(file);
                    }
                    this.nextFile();
                }
            }
            catch (err) {
                return Promise.reject(err);
            }
        });
        ee.addListener("next", this.nextFile);
        this.tcsClient = new client_socket_1.ClientSocket({
            linkName: "pbx=>tcs",
            host: "localhost",
            port: this.env.TCS_PORT,
            connectHandler: this.sendData
        });
    }
}
try {
    new PbxSimulator();
}
catch (err) {
    Barrel_1.logFatal(err.message);
    process.exit(0);
}
