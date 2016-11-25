import * as chai from 'chai';

process.env.BACKUP_PURGE_PERIOD_UNITS = 'minutes';
process.env.BACKUP_PURGE_PERIOD_LIMIT = 1;

import * as backup_tools from '../src/backup-scheduler/util';

let should = chai.should();
let expect = chai.expect;
let chai_assert = require('chai').assert;

describe('Test Case: Adding `members`: ', () => {

    afterEach(function (done) {
        // runs after each test in this block
    });
});

describe('Test Case: `Signups and Logins`: ', function () {

    it('Failed Login', function (done: any) {
        setTimeout(() => {
            console.log('All Done');
        }, 90000);
    });

    it('Signup and get members', function (done: any) {
        let JWT: string; // Need the JWT everywhere

    });
});

