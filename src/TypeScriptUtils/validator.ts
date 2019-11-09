const Ajv = require ("ajv");

export const validator = (schema: Object, config: any) => {

    // Validate the configuration
    const ajv = new Ajv({ allErrors: true, useDefaults: true, verbose: false });
    const validate = ajv.compile(schema);
    const valid = validate(config);

    if (!valid && validate.errors) {
        throw new Error (validate.errors[0].message);
    }
}
