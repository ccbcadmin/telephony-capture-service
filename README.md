# Telephony Capture Service (TCS)

This TCS consists of a number of routines to capture SMDR records from a telephone exchange and then pass the data on to 2 different parties:
<ol>
<li>A Telecom Management System (TMS).</li>
<li>After parsing the SMDR messages, they are then archived to the database (Postgres).</li>
</ol>
<br>
Technologies:
<ul>
<li>NodeJS</li>
<li>RabbitMQ: In order to ensure no data loss, in both cases, the data passes through persist queues supported by RabbitMQ en route to the recipients mentioned in bullets 1 and 2 above.</li>
<li>Docker and Docker Compose</li>
</ul>

Formal Documentation can be found in the folder 'docs'.  

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

