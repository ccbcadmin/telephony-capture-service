# Telephony Capture Service (TCS)

This TCS captures Station Message Detail Records (SMDR) from a telephone exchange and passes the data on to 2 external parties:
<ol>
<li>A Telecom Management System (TMS).  Note: the TMS is 3rd party software that aggregates call information and produces various reports.</li>
<li>Each SMDR message is parsed (CSV) and then archived to the database (Postgres).</li>
</ol>
<br>
# Related Support Tools
<br>
Also included in the TCS deliverables are some closely aligned tools that are useful both during the test and deployment phases of the TCS.  These are:
<ul>
<li>Mangle SMDR Files: Accepts as input files containing historical SMDR data.  The output are corresponding files that are largely identical to the input files, except that all telephone numbers have been 'mangled' so as to preserve anonymity.</li>
<li>Telephony Simulator: Mocks a stream of TCP messages to drive the TCS.  Useful for both load and function testing.</li>
<li>TMS Simulator: During testing the TMS Simulator is used to capture SMDR messages from the TCS.</li>
</ul>
<br>
# Technologies:
<ul>
<li>NodeJS</li>
<li>RabbitMQ: In order to ensure no data loss, in both cases, the data passes through persist queues supported by RabbitMQ en route to the recipients mentioned in bullets 1 and 2 above.</li>
<li>Docker and Docker Compose</li>
<li>PostgreSQL</li>
</ul>

A formal set of software requirements can be found in the folder 'docs'. 

```
TCS
├── README.md                                             This file
│
├── Dockerfile                                            TCS Dockerfile
│
├── docker-compose.yml                                    TCS Composition Definition
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
├── src                                                   TypeScript source code folder
│   ├── database-interface.ts                             Receives messages from queue and archives to DB
│   ├── mangle-smdr-files.ts                              Scrambles source telephone numbers
│   ├── share
│   │   ├── client-socket.ts                              Client-side TCP circuit management
│   │   ├── constants.ts                                  Various constants
│   │   ├── queue.ts                                      RabbitMQ interface
│   │   ├── server-socket.ts                              Server-side TCP circuit manamange
│   │   └── utility.ts                                    Various utilities
│   ├── telephony-capture-service.ts                      The TCS itself
│   ├── telephony-simulator.ts                            A simulator that sends SMDR messages to the TCS
│   ├── tms-interface.ts                                  Sends data to the TMS
│   └── tms-simulator.ts                                  A test mockup of the TMS
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

