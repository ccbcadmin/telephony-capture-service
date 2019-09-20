"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ajv_1 = __importDefault(require("ajv"));
exports.validator = (schema, config) => {
    const ajv = new ajv_1.default({ allErrors: true, useDefaults: true, verbose: false });
    const validate = ajv.compile(schema);
    const valid = validate(config);
    if (!valid && validate.errors) {
        throw new Error(validate.errors[0].message);
    }
};
