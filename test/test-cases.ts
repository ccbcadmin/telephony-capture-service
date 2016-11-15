/// <reference path="../../typings/globals/node/index.d.ts" />
/// <reference path="../../typings/globals/chai/index.d.ts" />
/// <reference path="../../typings/globals/mocha/index.d.ts" />

const TEST_MEMBER_COUNT = 100;  // Cannot be set to 0
const TEST_NEWS_ITEM_COUNT = 10;
const TEST_RENEWALS_COUNT = 10;
const TEST_CHANGE_PASSWORDS_COUNT = 10;
const test_member_index: string = String(TEST_MEMBER_COUNT - 1);

import * as chai from 'chai';

let chaiHttp = require('chai-http');
let server = require('../server.js');
let ttcDB = require('../ttcDB.js');
let should = chai.should();
let expect = chai.expect;
let chai_assert = require('chai').assert;
const uuid = require('uuid');

chai.use(chaiHttp);

// Start with a clean sheet
ttcDB.deleteMembers();
ttcDB.deleteRenewals();
ttcDB.deleteNewsItems();

// Create a number of random passwords, but mostly only need the first one;
// but will use them all during 'change password' testing.
let passwords: string[] = [];
for (let i = 0; i < TEST_CHANGE_PASSWORDS_COUNT + 1; ++i) {
    passwords.push(uuid.v4());
}

describe('Test Case: Adding `members`: ', () => {

    afterEach(function (done) {
        // runs after each test in this block
        chai.request(server)
            .get('/api/members/count')
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                done();
            })
            .catch(done);
    });

    after(function (done) {
        // runs after all tests in this block
        chai.request(server)
            .get('/api/members/count')
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                chai_assert(res.body === TEST_MEMBER_COUNT, 'Wrong number of members');
                done();
            })
            .catch(done);
    });

    for (let i = 0; i < TEST_MEMBER_COUNT; ++i) {
        it('Add a member: ' + i, (done: any) => {
            chai.request(server)
                .post('/api/members')
                .send({
                    firstname: 'test' + i,
                    familyname: 'name' + i,
                    dob: '1970-01-01',
                    address: 'address' + i,
                    place: 'Delta, BC, Canada',
                    postcode: 'V4M1P4',
                    primaryphone: '604-916-0162',
                    emailaddress: 'test' + i + '@example.com',
                    liabilityagreed: true,
                    communicationsagreed: true
                })
                .then((res: any) => {
                    res.should.have.status(200);
                    done();
                })
                .catch(done);
        });
    }
});

describe('Test Case: `Signups and Logins`: ', function () {

    it('Failed Login', function (done: any) {
        let agent = chai.request.agent(server);
        agent
            .post('/api/members/login')
            .send({ firstname: 'nonsense', emailaddress: 'nonsense@example.com', password: 'nonsense' })
            .then((res: any) => done('Test failure: Signup did not fail'))
            .catch((res: any) => {
                res.should.have.status(401);
                done();
            })
            .catch(done);
    });

    it('Signup and get members', function (done: any) {
        let JWT: string; // Need the JWT everywhere
        let agent = chai.request.agent(server);

        // Signup
        agent
            .post('/api/members/signup')
            .send({
                firstname: 'test' + test_member_index,
                familyname: 'name' + test_member_index,
                dob: '1970-01-01',
                postcode: 'V4M1P4',
                emailaddress: 'test' + test_member_index + '@example.com',
                password: passwords[0]
            })
            .then((res: any) => {
                res.should.have.status(200);
                res.should.have.cookie('sessionID');
                res.should.be.json;
                JWT = res.body.jwt;
            })
            .then(() => agent.get('/api/members').set('x-auth', JWT))
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                chai_assert(res.body.length === TEST_MEMBER_COUNT, 'Incorrect number of members returned');
            })
            // Then get the details for the logged-in user
            .then(() => agent.get('/api/members/' + JWT).set('x-auth', JWT))
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                done();
            })
            .catch(done);
    });

    it('Login, get members, and then renew them all', function (done: any) {
        let JWT: string; // Need the JWT everywhere
        let agent = chai.request.agent(server);
        let members: any[];

        agent
            // Login
            .post('/api/members/login')
            .send({
                firstname: 'test' + test_member_index,
                emailaddress: 'test' + test_member_index + '@example.com',
                password: passwords[0]
            })
            .then((res: any) => {
                res.should.have.status(200);
                res.should.have.cookie('sessionID');
                res.should.be.json;
                JWT = res.body.jwt;
            })

            // Get all members
            .then(() => agent.get('/api/members').set('x-auth', JWT))
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                members = res.body;
                chai_assert(members.length === TEST_MEMBER_COUNT, 'Incorrect number of members returned');
            })

            // Then get the details for the logged-in user
            .then(() => agent.get('/api/members/' + JWT).set('x-auth', JWT))
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
            })

            // Renew all the members in one go
            .then(() => {
                for (let member of members) {
                    agent.put('/api/members/' + member._id + '/renew').set('x-auth', JWT)
                        .then((res: any) => res.should.have.status(200))
                        .catch(done);
                }
                done();
            })
            .catch(done);
    });

    it('Signup and edit personal profile', function (done: any) {

        let JWT: string;
        let member: any = {};
        let agent = chai.request.agent(server);
        agent
            // Signup
            .post('/api/members/signup')
            .send({
                firstname: 'test' + test_member_index,
                familyname: 'name' + test_member_index,
                dob: '1970-01-01',
                postcode: 'V4M1P4',
                emailaddress: 'test' + test_member_index + '@example.com',
                password: passwords[0]
            })
            .then((res: any) => {
                res.should.have.status(200);
                res.should.have.cookie('sessionID');
                res.should.be.json;
                JWT = res.body.jwt;
            })

            // Then get the details for the logged-in user
            .then(() => agent.get('/api/members/' + JWT).set('x-auth', JWT))
            .then(function (res: any) {
                res.should.have.status(200);
                res.should.be.json;
                member = res.body;
                member.joiningyear = 2004; // Prepare for the next step
            })

            // Then update one of the member properties
            .then(() => agent.put('/api/members/' + JWT).send(member).set('x-auth', JWT))
            .then((res: any) => {
                chai_assert(res.body.joiningyear === 2004, 'Requested Update not performed');
                res.should.have.status(200);
                done();
            })
            .catch(done);
    });

    it('Login and edit personal profile', function (done: any) {

        let JWT: string;
        let member: any = {};
        let agent = chai.request.agent(server);
        agent
            // Signup
            .post('/api/members/login')
            .send({
                firstname: 'test' + test_member_index,
                emailaddress: 'test' + test_member_index + '@example.com',
                password: passwords[0]
            })
            .then((res: any) => {
                res.should.have.status(200);
                res.should.have.cookie('sessionID');
                res.should.be.json;
                JWT = res.body.jwt;
            })

            // Then get the details for the logged-in user
            .then(() => agent.get('/api/members/' + JWT).set('x-auth', JWT))
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                member = res.body;
                chai_assert(member.joiningyear === 2004, 'joiningyear incorrect');
                member.joiningyear = 2005; // Prepare for the next step
            })

            // Then update one of the member properties
            .then(() => agent.put('/api/members/' + JWT).send(member).set('x-auth', JWT))
            .then((res: any) => {
                chai_assert(res.body.joiningyear === 2005, 'Update not done');
                res.should.have.status(200);
                done();
            })
            .catch(done);
    });

    it('Signup failure', function (done: any) {

        let agent = chai.request.agent(server);
        agent
            .post('/api/members/signup')
            .send({
                firstname: 'test' + test_member_index,
                familyname: 'name' + test_member_index,
                dob: '1970-01-01',
                postcode: 'V4M1P4',
                emailaddress: 'nonsense' + test_member_index + '@example.com',
                password: passwords[0]
            })
            .then(() => done('Test failure: Signup did not fail'))
            .catch(function (res: any) {
                res.should.have.status(401);
                done();
            })
            .catch(done);
    });

    it('Login failure', function (done: any) {

        chai.request(server)
            .post('/api/members/login')
            .send({
                firstname: 'test' + test_member_index,
                emailaddress: 'test' + test_member_index + '@example.com',
                password: 'nonsense'
            })
            .then(() => done('Test failure: Login did not fail'))
            .catch((res: any) => {
                res.should.have.status(401);
                done();
            })
            .catch(done);
    });

    it('Logout and then fail to get all members', function (done: any) {
        let agent = chai.request.agent(server);

        agent
            .post('/api/members/logout')
            .then((res: any) => {
                res.should.have.status(200);
                agent
                    .get('/api/members')
                    .then(() => done('Test Failure: Read `members` without authorization'))
                    .catch((err: any) => {
                        err.should.have.status(440);
                        done();
                    })
                    .catch(done);
            })
            .catch(done);
    });
});

describe('Test Case: `renewals`: ', () => {

    let JWT: string;
    let memberId: string;
    let agent = chai.request.agent(server);

    it('Login', function (done: any) {
        agent
            .post('/api/members/login')
            .send({
                firstname: 'test' + test_member_index,
                emailaddress: 'test' + test_member_index + '@example.com',
                password: passwords[0]
            })
            .then((res: any) => {
                res.should.have.status(200);
                JWT = res.body.jwt;
            })
            .then(() => agent.get('/api/members/' + JWT).set('x-auth', JWT))
            .then((res: any) => {
                memberId = res.body._id;
                done();
            })
            .catch(done);
    });

    for (let i = 0; i < TEST_RENEWALS_COUNT; ++i) {
        it('Add Renewal[' + i + ']', (done: any) => {
            agent
                .put('/api/renewals').set('x-auth', JWT)
                .send({
                    memberId: memberId,
                    year: 2016 + i,
                    renewed: false,
                    paid: true
                })
                .then((res: any) => {
                    res.should.have.status(200);
                    done();
                })
                .catch(done);
        });
    }

    // Get all renewals
    it('Read renewals', (done: any) => {
        agent
            .get('/api/renewals').set('x-auth', JWT)
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                done();
            })
            .catch(done);
    });
});

describe('Test Case: `newsitems`: ', () => {

    after(function (done) {
        done();
        return;
        // Ensure that all `newsitems` are gone
        chai.request(server)
            .get('/api/newsitems')
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                chai_assert(res.body.length === 0, 'Failed to delete all News Items');
                done();
            })
            .catch(done);
    });

    let JWT: string;
    let member: any = {};
    let agent = chai.request.agent(server);

    // Start by logging in
    it('Login and ensure member has sufficient privilges to add Renewals', function (done: any) {

        agent
            // Signup
            .post('/api/members/login')
            .send({
                firstname: 'test' + test_member_index,
                emailaddress: 'test' + test_member_index + '@example.com',
                password: passwords[0]
            })
            .then(function (res: any) {
                res.should.have.status(200);
                res.should.have.cookie('sessionID');
                res.should.be.json;
                JWT = res.body.jwt;
            })

            // Then get the details for the logged-in user
            .then(() => agent.get('/api/members/' + JWT).set('x-auth', JWT))
            .then(function (res: any) {
                res.should.have.status(200);
                res.should.be.json;
                member = res.body;
                member.role = 'admin'; // Prepare for the next step
            })

            // Then update the member's role (so that we can add and delete newitems)
            .then(() => agent.put('/api/members/' + JWT).send(member).set('x-auth', JWT))
            .then(function (res: any) {
                res.should.have.status(200);
                chai_assert(res.body.role === 'admin', 'Role change failed');
                done();
            })
            .catch(done);
    });

    for (let i = 0; i < TEST_NEWS_ITEM_COUNT; ++i) {
        it('Add News Item: ' + i, (done: any) => {
            let newObjectId: string;
            agent
                .get('/api/newobject').set('x-auth', JWT)
                .then((res: any) => newObjectId = res.body)
                .then(() => agent
                    .post('/api/newsitems')
                    .set('x-auth', JWT)
                    .send({
                        _id: newObjectId,
                        headline: 'headline_' + i,
                        body: 'body_' + i
                    }))
                .then((res: any) => {
                    res.should.have.status(200);
                    done();
                })
                .catch(done);
        });
    }

    it('Delete all the News Items', (done: any) => {
        let newsItems: any[];
        agent
            .get('/api/newsitems')
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                newsItems = res.body;
                chai_assert(res.body.length === TEST_NEWS_ITEM_COUNT, 'Incorrect number of News Items recorded');

                // Now delete them all
                for (let newsItem of newsItems) {
                    agent.delete('/api/newsitems/' + newsItem._id).set('x-auth', JWT)
                        .then((res: any) => res.should.have.status(200))
                        .catch(done);
                }
            })

            // Ensure no newsitems are left
            .then(() => agent.get('/api/newsitems/count').set('x-auth', JWT))
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                done();
            })
            .catch(done);
    });

    it('Get `newsitems` files', (done: any) => {
        chai.request(server)
            .get('/api/newsitems/1/files')
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                done();
            })
            .catch(done);
    });
});


describe('Test Case: `executive`: ', () => {

    it('GET /api/executive', (done: any) => {
        chai.request(server)
            .get('/api/executive')
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                // There will always be at least 10 executive positions 
                chai_assert(res.body.length >= 10, 'Test Failure: Too few executive positions');
                done();
            })
            .catch(done);
    });
});

describe('Test Case: Miscellaneous: ', () => {

    // Should get a 4xx if we call a nonsense endpoint
    it('Read from a nonsense endpoint', (done: any) => {
        chai.request(server)
            .get('/api/nonsense')
            .then((res: any) => done('Test Failure: Read of nonsense endpoint succeeded'))
            .catch((res: any) => {
                res.should.have.status(440);
                done();
            })
            .catch(done);
    });
});

describe('Test Case: Changing Passwords: ', () => {

    let JWT: string;
    let agent = chai.request.agent(server);

    for (let i = 0; i < TEST_CHANGE_PASSWORDS_COUNT; ++i) {
        it('Login and change passwords: ' + i, function (done: any) {

            agent
                .post('/api/members/login')
                .send({
                    firstname: 'test' + test_member_index,
                    emailaddress: 'test' + test_member_index + '@example.com',
                    password: passwords[i]
                })
                .then(function (res: any) {
                    res.should.have.status(200);
                    res.should.be.json;
                    JWT = res.body.jwt;
                })
                .then(() => agent.post('/api/members/' + JWT + '/change-password').set('x-auth', JWT).send({ password: passwords[i + 1] }))
                .then((res: any) => {
                    res.should.have.status(200);
                    done();
                })
                .catch(done);
        });
    }
});

describe('Final Cleanup: ', () => {
    it('Delete all members', function (done: any) {
        let JWT: string; // Need the JWT everywhere
        let agent = chai.request.agent(server);
        let members: any[];

        agent
            // Login
            .post('/api/members/login')
            .send({
                firstname: 'test' + test_member_index,
                emailaddress: 'test' + test_member_index + '@example.com',
                password: passwords[TEST_CHANGE_PASSWORDS_COUNT]
            })
            .then((res: any) => {
                res.should.have.status(200);
                res.should.have.cookie('sessionID');
                res.should.be.json;
                JWT = res.body.jwt;
            })

            // Get all members
            .then(() => agent.get('/api/members').set('x-auth', JWT))
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                members = res.body;
                chai_assert(members.length === TEST_MEMBER_COUNT, 'Incorrect number of members returned');

                // Now delete them all
                for (let member of members) {
                    agent.delete('/api/members/' + member._id).set('x-auth', JWT)
                        .then((res: any) => res.should.have.status(200))
                        .catch(done);
                }
            })

            // Ensure all members have been deleted
            .then(() => agent.get('/api/members').set('x-auth', JWT))
            .then((res: any) => {
                res.should.have.status(200);
                res.should.be.json;
                chai_assert(res.body.length === 0, 'Test failure: number of members should be 0');
                done();
            })
            .catch(done);
    });
});
