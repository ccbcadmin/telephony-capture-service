#!/usr/bin/env node
var server_socket_1 = require("../share/server-socket");
const routineName = "tms-simulator";
const envalid = require("envalid");
const { str } = envalid;
const env = envalid.cleanEnv(process.env, {
    TMS_PORT: str()
});
process.on("SIGTERM", () => {
    console.log(`${routineName} terminated`);
    process.exit(0);
});
process.on("SIGINT", () => {
    console.log(`Ctrl-C received. ${routineName} terminated`);
    process.exit(0);
});
const dataDump = (data) => { };
new server_socket_1.ServerSocket("tcs=>tms", env.TMS_PORT, dataDump).startListening();
