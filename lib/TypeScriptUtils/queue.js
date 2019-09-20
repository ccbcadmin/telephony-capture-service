"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_1 = __importDefault(require("async"));
const logger_1 = require("./logger");
const Barrel_1 = require("../Barrel");
const timer = (timeout) => new Promise((resolve, reject) => {
    try {
        setTimeout(resolve, timeout, null);
    }
    catch (err) {
        reject(err);
    }
});
const queuePush = (q, task) => new Promise((resolve, reject) => {
    try {
        q.push(task, (err) => {
            resolve();
        });
    }
    catch (err) {
        reject(err);
    }
});
(() => __awaiter(this, void 0, void 0, function* () {
    const q = async_1.default.queue((task, callback) => __awaiter(this, void 0, void 0, function* () {
        yield timer(1000);
        logger_1.logError("Task: ", task.name);
        callback();
    }), 1);
    yield q.drain();
    yield queuePush(q, { name: "foo0" });
    logger_1.logError('finished processing foo0');
    q.push({ name: 'bar1' }, (err) => {
        logger_1.logError('finished processing bar');
    });
    q.push({ name: 'bar2' }, (err) => {
        logger_1.logError('finished processing bar');
    });
    const testObj = { name: "foo" };
    yield queuePush(q, testObj);
    yield q.push(testObj);
    logger_1.logError('finished processing foo');
    q.push([{ name: 'baz' }, { name: 'bay' }, { name: 'bax' }], function (err, data) {
        logger_1.logError('finished processing item');
        Barrel_1.trace({ data });
    });
    q.unshift({ name: 'bar' }, (err) => {
        logger_1.logError('finished processing bar');
    });
    yield timer(2000);
    const junk = () => {
        logger_1.logError('Hi There!');
    };
    q.push({ name1: 'foo', name2: 'foo2' });
}))();
