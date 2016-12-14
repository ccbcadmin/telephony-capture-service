"use strict";
const $ = require("../share/constants");
const server_socket_1 = require("../share/server-socket");
const routineName = 'tms-simulator';
const envalid = require('envalid');
const { str } = envalid;
const env = envalid.cleanEnv(process.env, {
    TMS_PORT: str()
});
process.on('SIGTERM', () => {
    console.log(`${routineName} terminated`);
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});
let recordCount = 0;
let leftOver = '';
const dataDump = (data) => {
    const unprocessedData = leftOver.slice(0) + data.slice(0);
    const crLfIndexOf = unprocessedData.indexOf($.CRLF);
    const msg = unprocessedData.match(/\x00\x02\x00\x00\x00\x00(.+)\x0d\x0a/);
    if (msg) {
        if (++recordCount % 20 === 5)
            process.stdout.write('\b-');
        else if (recordCount % 20 === 10)
            process.stdout.write('\b\\');
        else if (recordCount % 20 === 15)
            process.stdout.write('\b|');
        else if (recordCount % 20 === 0)
            process.stdout.write('\b/');
        leftOver = unprocessedData.slice(crLfIndexOf + 2);
    }
    else {
        leftOver = unprocessedData.slice(0);
    }
};
new server_socket_1.ServerSocket(routineName, env.TMS_PORT, dataDump);
