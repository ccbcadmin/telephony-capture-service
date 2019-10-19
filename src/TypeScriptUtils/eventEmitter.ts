import { EventEmitter } from "events";
export const eventEmitter = new EventEmitter();
EventEmitter.defaultMaxListeners = 30;
