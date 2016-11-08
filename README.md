# Using this module in other modules

Here is a quick example of how this module can be used in other modules. The [TypeScript Module Resolution Logic](https://www.typescriptlang.org/docs/handbook/module-resolution.html) makes it quite easy. The file `src/index.ts` acts as an aggregator of all the functionality in this module. It imports from other files and re-exports to provide a unified interface for this module. The _package.json_ file contains `main` attribute that points to the generated `lib/index.js` file and `typings` attribute that points to the generated `lib/index.d.ts` file.

> If you are planning to have code in multiple files (which is quite natural for a NodeJS module) that users can import, make sure you update `src/index.ts` file appropriately.

Now assuming you have published this amazing module to _npm_ with the name `my-amazing-lib`, and installed it in the module in which you need it -

- To use the `Greeter` class in a TypeScript file -

```ts
import { Greeter } from "my-amazing-lib";

const greeter = new Greeter("World!");
greeter.greet();
```

- To use the `Greeter` class in a JavaScript file -

```js
const Greeter = require('my-amazing-lib').Greeter;

const greeter = new Greeter('World!');
greeter.greet();

```
```
TCS
├── README.md                                             This file
├── Dockerfile                                            TCS Dockerfile
├── docker-compose.yml                                    TCS Composition Definition
├── docs
│   ├── SMDR Fields IPO 9.1.4 Required Fields.docx        SMDR record definition
│   ├── TCS Software Requirements Document.docx           TCS SRD
│   └── TCS Test Management Plan.docx                     ToDo: TCS Management Plan
├── lib                                                   Transpiled *.js scripts
├── package.json
├── src                                                   TypeScript source code
│   ├── database-interface.ts                             Receives messages from a queue and archives them to the DB
│   ├── mangle-smdr-files.ts
│   ├── share
│   │   ├── client-socket.ts
│   │   ├── constants.ts
│   │   ├── queue.ts
│   │   ├── server-socket.ts
│   │   └── utility.ts
│   ├── telephony-capture-service.ts
│   ├── telephony-simulator.ts
│   ├── tms-interface.ts
│   └── tms-simulator.ts
├── test
│   └── test-cases.ts
├── tsconfig.json
├── tslint.json
└── typings
```

