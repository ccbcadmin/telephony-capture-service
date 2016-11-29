"use strict";
const chai = require('chai');
process.env.BACKUP_PURGE_PERIOD_UNITS = 'minutes';
process.env.BACKUP_PURGE_PERIOD_LIMIT = 1;
let should = chai.should();
let expect = chai.expect;
let chai_assert = require('chai').assert;
describe('Test Case: Adding `members`: ', () => {
    afterEach(function (done) {
    });
});
describe('Test Case: `Signups and Logins`: ', function () {
    it('Failed Login', function (done) {
        setTimeout(() => {
            console.log('All Done');
        }, 90000);
    });
    it('Signup and get members', function (done) {
        let JWT;
    });
});
