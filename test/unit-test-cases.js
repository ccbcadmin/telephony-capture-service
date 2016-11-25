"use strict";
var chai = require('chai');
process.env.BACKUP_PURGE_PERIOD_UNITS = 'minutes';
process.env.BACKUP_PURGE_PERIOD_LIMIT = 1;
var should = chai.should();
var expect = chai.expect;
var chai_assert = require('chai').assert;
describe('Test Case: Adding `members`: ', function () {
    afterEach(function (done) {
        // runs after each test in this block
    });
});
describe('Test Case: `Signups and Logins`: ', function () {
    it('Failed Login', function (done) {
        setTimeout(function () {
            console.log('All Done');
        }, 90000);
    });
    it('Signup and get members', function (done) {
        var JWT; // Need the JWT everywhere
    });
});
