export const CRLF = '\x0d\x0a';
export const DATABASE_QUEUE = 'DATABASE_QUEUE';
export const SMDR_PREAMBLE = '\x00\x02\x00\x00\x00\x00';
export const TMS_QUEUE = 'TMS_QUEUE';

// RegExp to filter for files containing SMDR records
export const REGEXP_SMDR_FILENAME = /rw[0-9]{6,}.00[1-9]$/;