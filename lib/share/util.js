"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = (t) => new Promise(resolve => {
    setTimeout(resolve, t);
});
