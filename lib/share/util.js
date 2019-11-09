"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ifs = require("os").networkInterfaces();
exports.networkIP = Object.keys(ifs)
    .map(x => ifs[x].filter(x => x.family === "IPv4" && !x.internal)[0])
    .filter(x => x)[0].address;
exports.sleep = (t) => new Promise((resolve) => {
    setTimeout(resolve, t);
});
