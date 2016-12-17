# Telephony Capture Service (TCS)
This TCS captures Station Message Detail Records (SMDR) from a telephone exchange and passes the data on to 2 external parties:
<ol>
<li>A Telecom Management System (TMS).  Note: the TMS is 3rd party software that aggregates call information and produces various reports.</li>
<li>Each SMDR message is parsed (CSV) and then archived to the database (Postgres).</li>
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
Also included in the TCS deliverables are some closely aligned tools that are useful both during the test and deployment phases of the TCS.  These are:
<ul>
<li>Mangle SMDR Files: Accepts as input files containing historical SMDR data.  The output are corresponding files that are largely identical to the input files, except that all telephone numbers have been 'mangled' so as to preserve anonymity.</li>
<li>PBX Simulator: Mocks a stream of SMDR messages to drive the TCS.  Useful for both load and function testing.</li>
<li>TMS Simulator: During testing the TMS Simulator is used to capture SMDR messages from the TCS.</li>
</ul>
# Database Redundancy / Recovery
Given that the database is the customer's first oeprational server database, the project also includes database installation and related database management functions.  Broadly, the system works as
follows:
<ul>
<li>Two (2) docker containers each support distinct database instances.  One is operational and the other is nominally only available as a cold standby.</li>
<li>A third 'Barman' container carries out the following actions: i) Runs a scheduled full database backup on a regular schedule and 2) Continuously receives a stream of log-shipping files from the operational 
database container.</li>
<li>On demand a backup recovery to the cold database container can be triggered.  Once the recovery is complete, the recovered database can be started either to investigate some
historical anomaly or even made operational.</li>
<li>Barman supports PITR (Point In Time Recovery), hence it is possible to view the database state as it existed at some point in the past.</li>
</ul>
```
TCS
├── README.md                                             This file
│
├── docker-compose.env                                    Project environment variables
│
├── docker-compose.yml                                    TCS docker-compose definition
│
├── docker-compose.override.yml                           Development build overrides
│
├── docs
│   ├── SMDR Fields IPO 9.1.4 Required Fields.docx        SMDR record definition
│   ├── TCS Software Requirements Document.docx           TCS SRD
│   └── TCS Test Management Plan.docx                     ToDo: TCS Management Plan
│
├── lib                                                   Transpiled *.js scripts
│
├── package.json                                          npm package definition
│
├── src                                                   
│   ├── backup-scheduler                                  Schedules new backups and purges old
│   │   └── backup-scheduler.ts                         
│   ├── tcs-image                                         Postgres image specialized for the TCS.
│   │   ├── barman                                        Barman configuration files.
│   │   │   ├── barman.conf                               The core barman configuration file
│   │   │   ├── pg1.conf                                  barman config file for the 1st Postgres container
│   │   │   └── pg2.conf                                  barman config file for the 2nd Postgres container
│   │   └── Dockerfile                                    Dockerfile to build the TCS image.
│   │
│   ├── database-interface                                Inserts SMDR records into the database
│   │   └── database-interface.ts                         
│   ├── mangle                                            Scrambles source telephone numbers
│   │   └── mangle.ts                                     (a command line tool)
│   ├── share
│   │   ├── client-socket.ts                              Client-side TCP circuit management
│   │   ├── constants.ts                                  
│   │   ├── queue.ts                                      RabbitMQ interface
│   │   ├── server-socket.ts                              Server-side TCP circuit management
│   │   └── utility.ts                                    Various utilities
│   ├── pbx-interface                                     Receives messages from the PBX
│   │   └── pbx-interface.ts                         
│   ├── pbx-simulator                                     A simulator that sends SMDR messages to the 
│   │   └── pbx-simulator.ts                              pbx-interface.
│   ├── tms-interface                                     Forwards on raw data bytes to the TMS
│   │   └── tms-interface.ts                         
│   └── tms-simulator                                     A test mockup of the TMS
│       └── tms-simulator.ts                         
│
├── test
│   └── test-cases.ts                                     Todo: Mocha test code
│
├── tsconfig.json                                         TypeScript configuration settings
│
├── tslint.json                                           Lint configuration for TypeScript
│
└── typings                                
```

