# Telephony Capture Service (TCS)
This TCS captures Station Message Detail Records (SMDR) from a telephone exchange (PBX) and passes the data on to 2 external parties:
<ol>
<li>A Telecom Management System (TMS).  Note: the TMS is 3rd party software that aggregates call information and produces various reports.</li>
<li>Each SMDR message is parsed archived to the database (Postgres).</li>
</ol>
A formal set of software requirements can be found in the folder 'docs'. 
# Technologies
<ul>
<li>NodeJS</li>
<li>RabbitMQ: In order to ensure no data loss, in both cases, the data passes through persistant queues supported by RabbitMQ en route to the recipients mentioned in bullets 1 and 2 above.</li>
<li>Docker / Docker Compose</li>
<li>PostgreSQL</li>
<li>Barman (http://www.pgbarman.org/)</li>
</ul>
# Related Support Tools
Also included in the TCS deliverables are some closely aligned tools that are useful during the test and deployment phases of the TCS.  These are:
<ul>
<li>Mangle SMDR Files: Accepts input files containing historical SMDR data.  The output is corresponding files that are largely identical to the input files, except that all telephone numbers have been 'mangled' so as to preserve anonymity.</li>
<li>PBX Simulator: Mocks a stream of SMDR messages to drive the TCS.  Useful for load and function testing, but is also used to do load historical SMRD records.</li>
<li>TMS Simulator: During testing the TMS Simulator is used to capture SMDR messages from the TCS.</li>
</ul>
# Database Redundancy / Recovery
Given that the database is the customer's first oeprational server database, the project also includes database installation and related database management functions.  Broadly, the system works as follows:
<ul>
<li>Two (2) docker containers each support distinct database instances.  One is operational (pg1) and the other is nominally only available as a cold standby (pg2).</li>
<li>A third 'Barman' container carries out the following actions: i) Runs a scheduled full database backups on a regular (and configurable) schedule and 2) Continuously receives a stream of WAL log-shipping files from the operational database container (pg1).</li>
<li>On demand a backup recovery to pg2 database container can be triggered.  Once the recovery is complete, the recovered database can be started either to investigate some
historical anomaly.</li>
<li>Barman supports PITR (Point In Time Recovery), hence it is possible to view the database state as it existed at some precise point in the past.</li>
</ul>
```
TCS
├── README.md                                             This file
│
├── docker-compose.yml                                    Project-level docker-compose definition
│
├── .env                                                  Project-level environment variables
│
├── env_DEV                                               Development operating environment definition
│   ├── .env                                 			  Devolopment environment variables
│   └── docker-compose.yml                     			  Development docker-compose config file
│
├── env_PROD                                              Production operating environment definition
│   ├── .env                                 			  Production environment variables
│   └── docker-compose.yml                     			  Production docker-compose config file
│
├── env_QA                                                QA operating environment definition
│   ├── .env                                 			  QA environment variables
│   └── docker-compose.yml                     			  QA docker-compose config file
│
├── env_STORES                                            Stores operating environment definition
│   └── docker-compose.yml                     			  Stores docker-compose config file
│
├── docs
│   ├── SMDR Fields IPO 9.1.4 Required Fields.docx        SMDR record definition
│   ├── TCS Software Requirements Document.docx           Software requirements
│   ├── TCS Developer Manual.docx						  A developer-level user manual.
│   ├── TCS User Manual.docx		      				  A user manual for the general user.	
│   └── TCS Test Management Plan.docx                     TCS Management Plan
│
├── lib                                                   Transpiled *.js scripts
│
├── package.json                                          npm package definition
│
├── src                                                   
│   ├── backup-scheduler                                  Triggers Postgres backups
│   │   └── backup-scheduler.ts                         
│   │
│   ├── tcs-image                                         Postgres image specialized for the TCS.
│   │   ├── barman                                        Barman configuration files.
│   │   │   ├── barman.conf                               The basic barman configuration file
│   │   │   ├── pg1.conf                                  barman config file for the 1st Postgres container
│   │   └── Dockerfile                                    Dockerfile to build the TCS image.
│   │
│   ├── database-interface                                Inserts SMDR records into the database
│   │   └── database-interface.ts                         
│   │
│   ├── integrate                                         A folder that contains all the QA source code
│   │   ├── test-pbx-to-tms-flow.ts                       Pumps a lot of  data through the TCS
│   │   │												  to ensure no data loss.
│   │   ├── test-queuing-no-ack.ts                        Ensure that queued messages survive, even if not acked. 
│   │   │												  that all data is recorded to the database correctly.
│   │   ├── test-smdr-capture.ts                          Inject a number of SMDR records into the TCS and ensure 
│   │   │												  that all data is recorded to the database correctly.
│   │   ├── test-pbx-link-reopening.ts                    Test opening / closing of the PBX link.
│   │   │												  
│   │   ├── test-rabbit-interrruption-part1.ts            Part 1 sends a lot of data to the queuing service, the 
│   │   ├── test-rabbit-interrruption-part2.ts			  queuing service is then restarted, and part2 checks that
│   │   │												  the queued data survived the restart.
│   │   ├── test-recording-smdr-files.ts                  Copies of incoming SMDR records are recorded into files;
│   │   │												  this test assures the recording is correct.
│   │   └── test-tms-link-reopening.ts                    Test opening / closing of the TMS link.
│   │
│   ├── mangle                                            Scrambles source telephone numbers
│   │   └── mangle.ts                                     (a command line tool)
│   │
│   ├── share
│   │   ├── client-socket.ts                              Client-side TCP circuit management
│   │   ├── constants.ts                                  
│   │   ├── queue.ts                                      RabbitMQ interface
│   │   ├── server-socket.ts                              Server-side TCP circuit management
│   │   └── utility.ts                                    Various utilities
│   │
│   ├── pbx-interface                                     Receives messages from the PBX
│   │   └── pbx-interface.ts                         
│   │
│   ├── pbx-simulator                                     A simulator that sends SMDR messages to the 
│   │   └── pbx-simulator.ts                              pbx-interface.
│   │
│   ├── tms-interface                                     Forwards on raw data bytes to the TMS
│   │   └── tms-interface.ts                         
│   │
│   └── tms-simulator                                     A test mockup of the TMS
│       └── tms-simulator.ts                         
│
├── .tcs.version                                          Defines the TCS version number
│
├── tsconfig.json                                         TypeScript configuration settings
│
├── tslint.json                                           Lint configuration for TypeScript
```

