#!/usr/bin/env node
"use strict";
const client_socket_1 = require("../share/client-socket");
const queue_1 = require("../share/queue");
const routineName = "test-smdr-capture-accuracy";
const pgp = require("pg-promise")();
const _ = require("lodash");
const net = require("net");
const eventEmitter = require("events").EventEmitter;
const ee = new eventEmitter;
const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    TCS_PORT: num(),
    DATABASE: str(),
    DB_QUEUE: str()
});
const stringOccurrences = (string, subString, allowOverlapping = false) => {
    string += "";
    subString += "";
    if (subString.length <= 0)
        return (string.length + 1);
    var n = 0, pos = 0, step = allowOverlapping ? 1 : subString.length;
    while (true) {
        pos = string.indexOf(subString, pos);
        if (pos >= 0) {
            ++n;
            pos += step;
        }
        else
            break;
    }
    return n;
};
const test1SmdrMessages = new Buffer("\
2015/03/01 00:54:10,00:00:45,5,16046150477,I,203,,,0,1008741,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:06:28,00:03:37,6,6044301510,I,203,,,0,1008742,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:12:25,00:05:19,6,,I,203,,,0,1008743,0,E217,Volunteer8,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:21:24,00:00:00,18,6042904566,I,206,,,0,1008745,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:18:00,00:06:23,5,6046136447,I,206,,,0,\
", 'ascii');
const test2SmdrMessages = new Buffer("\
1008744,0,E218,Volunteer9,T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:27:10,00:00:14,21,,I,203,,,0,1008746,0,T9001,Line 1.0,V9542,VM Channel 42,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:39:34,00:00:00,13,7785934953,I,206,,,0,1008749,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:28:55,00:11:03,5,6045007440,I,206,,,0,1008747,0,E218,Volunteer9,T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 01:54:10,00:00:45,5,16046150477,I,203,,,0,1008741,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:06:28,00:03:37,6,6044301510,I,203,,,0,1008742,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:12:25,00:05:19,6,,I,203,,,0,1008743,0,E217,Volunteer8,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:21:24,00:00:00,18,6042904566,I,206,,,0,1008745,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:18:00,00:06:23,5,6046136447,I,206,,,0,1008744,0,E218,Volunteer9,T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:27:10,00:00:14,21,,I,203,,,0,1008746,0,T9001,Line 1.0,V9542,VM Channel 42,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:39:34,00:00:00,13,7785934953,I,206,,,0,1008749,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:28:55,00:11:03,5,6045007440,I,206,,,0,1008747,0,E218,Volunteer9,\
", 'ascii');
const test3SmdrMessages = new Buffer("\
T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 02:54:10,00:00:45,5,16046150477,I,203,,,0,1008741,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:06:28,00:03:37,6,6044301510,I,203,,,0,1008742,0,E218,Volunteer9,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:12:25,00:05:19,6,,I,203,,,0,1008743,0,E217,Volunteer8,T9001,Line 1.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:21:24,00:00:00,18,6042904566,I,206,,,0,1008745,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:18:00,00:06:23,5,6046136447,I,206,,,0,1008744,0,E218,Volunteer9,T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:27:10,00:00:14,21,,I,203,,,0,1008746,0,T9001,Line 1.0,V9542,VM Channel 42,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:39:34,00:00:00,13,7785934953,I,206,,,0,1008749,0,E206,Vol N VM,T9015,Line 15.0,0,0,,,,,,,,,,,,,\x0d\x0a\
2015/03/01 03:28:55,00:11:03,5,6045007440,I,206,,,0,1008747,0,E218,Volunteer9,T9014,Line 14.0,0,0,,,,,,,,,,,,,\x0d\x0a\
", 'ascii');
let smdrMsgsSent = 0;
const tcsSocket = new client_socket_1.ClientSocket("PBX->TCS", "localhost", env.TCS_PORT);
const sendSmdrRecords = (testMsgs) => {
    smdrMsgsSent += stringOccurrences(testMsgs.toString(), "\x0d\x0a");
    if (!tcsSocket.write(testMsgs)) {
        console.log("Link to TCS unavailable...aborting.");
        process.exit(1);
    }
};
const connection = {
    host: "localhost",
    port: 5432,
    database: env.DATABASE,
    user: "postgres"
};
const db = pgp(connection);
const testSelect = (query, expected) => new Promise((resolve, reject) => {
    console.log(query);
    db.one(query)
        .then(response => {
        console.log(response.count, expected);
        if (response.count == expected) {
            resolve('... passed');
        }
        else {
            reject(`Query Failure: ${query}, ${response.count} Returned, ${smdrMsgsSent} Expected`);
        }
    })
        .catch(reject);
});
const databaseCheck = () => {
    testSelect("select count(*) from smdr;", smdrMsgsSent)
        .then(() => { testSelect("select count(*) from smdr where connected_time = '319 seconds'::INTERVAL;", 3); })
        .then(() => { testSelect("select count(*) from smdr where ring_time = '5 seconds'::INTERVAL;", 9); })
        .then(() => { testSelect("select count(*) from smdr where caller = '6044301510';", 3); })
        .then(() => { console.log('Exiting Pass'); process.exit(0); })
        .catch(error => { console.log(JSON.stringify(error, null, 4)); process.exit(1); });
};
db.none("delete from smdr;")
    .then(() => _.noop)
    .catch(error => {
    console.log("database purge error: ", JSON.stringify(error));
    process.exit(1);
});
const databaseQueue = new queue_1.Queue(env.DB_QUEUE, null, null, null);
setTimeout(() => {
    databaseQueue.purge();
    sendSmdrRecords(test1SmdrMessages);
    sendSmdrRecords(test2SmdrMessages);
    sendSmdrRecords(test3SmdrMessages);
    setTimeout(() => {
        databaseCheck();
    }, 2000);
}, 2000);
