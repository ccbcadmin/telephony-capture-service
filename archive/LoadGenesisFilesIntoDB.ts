const pg = require('pg');
// const conn = new pg.Client({url: 'postgres://jumvxsay:X_rm6ZgLK_sjEgLgOEaI6TGJL5kjFCCy@elmer.db.elephantsql.com:5432/jumvxsay'});
// const conn = new pg.Client();
const conn = new pg.Client({
	host: 'elmer-01.db.elephantsql.com',
	port: 5432,
	user: 'jumvxsay',
	password: 'X_rm6ZgLK_sjEgLgOEaI6TGJL5kjFCCy',
	database: 'jumvxsay'
});
conn.connect();

const _ = require('lodash');
const LineByLineReader = require('line-by-line');
const lr = new LineByLineReader('Data/SampleGenesisData.txt');


const insertCallRecords = (callDate: any, callDuration: any, dialedDigits: any, areaCode: any, desinationCode: any, callDirection: any, cityName: any, callType: any, cb: any) => {
	let sql = `
    INSERT INTO CALL_RECORDS (CALL_DATE, CALL_DURATION, DIALED_DIGITS, AREA_CODE, DESTINATION_CODE, CALL_DIRECTION, CITY_NAME, CALL_TYPE)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

	conn.query(sql, [callDate, callDuration, dialedDigits, areaCode, desinationCode, callDirection, cityName, callType], err => {
		if (err) {
			return cb(err);
		} else {
			cb(null);
		}
	});
}

lr.on('error', err => {
	console.log('error: ', err);
});

lr.on('line', (line: string) => {
	// pause emitting of lines...
	lr.pause();

	let callDate = line.slice(0, 8);
	let callDuration = line.slice(13, 19);
	let dialedDigits = line.slice(105, 125);
	let areaCode = line.slice(125, 128);
	let destinationCode = line.slice(128, 130);
	let callDirection = line.slice(130, 131);
	let cityName = line.slice(131, 141);
	let callType = line.slice(141, 142);

	console.log(callDate, callDuration, dialedDigits);

	insertCallRecords(callDate, callDuration, dialedDigits, areaCode, destinationCode, callDirection, cityName, callType,
		err => {
			if (err) {
				console.log('err: ', err);
				process.exit();
			}
			else {
				lr.resume();
			}
		});
});

lr.on('end', () => {
	console.log('end of file');
	process.exit();
});
