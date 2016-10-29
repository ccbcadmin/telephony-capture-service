export namespace LoadGenesisWithPromises {

	interface CallRecord {
		callDate: string,
		callDuration: string,
		dialedDigits: string,
		areaCode: string,
		destinationCode: string,
		callDirection: string,
		cityName: string,
		callType: string
	}

	const _ = require('lodash');

	// Interact with the DB with promises
	const db = require('pg-promise')()('postgres://jumvxsay:X_rm6ZgLK_sjEgLgOEaI6TGJL5kjFCCy@elmer.db.elephantsql.com:5432/jumvxsay');

	const insertCallRecords = (callRecord: CallRecord) =>
		db.none(`INSERT INTO CALL_RECORDS (
					CALL_DATE, CALL_DURATION, DIALED_DIGITS, AREA_CODE, DESTINATION_CODE, CALL_DIRECTION, CITY_NAME, CALL_TYPE)
    				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[callRecord.callDate, callRecord.callDuration, callRecord.dialedDigits, callRecord.areaCode,
			callRecord.destinationCode, callRecord.callDirection, callRecord.cityName, callRecord.callType]);

	// Read in a line at a time, parse the line, and then send to the DB
	const lr = new (require('line-by-line'))('Data/SampleGenesisData.txt');

	lr.on('error', err => {
		console.log('error: ', err);
		process.exit();
	});

	lr.on('line', (line: string) => {
		// pause emitting lines while we do an async write to the DB
		lr.pause();

		let callRecord: CallRecord = {
			callDate: line.slice(0, 8),
			callDuration: line.slice(13, 19),
			dialedDigits: line.slice(105, 125),
			areaCode: line.slice(125, 128),
			destinationCode: line.slice(128, 130),
			callDirection: line.slice(130, 131),
			cityName: line.slice(131, 141),
			callType: line.slice(141, 142)
		};

		// console.log(callRecord);

		insertCallRecords(callRecord)
			// If everything OK, then move on to the next line of the file
			.then(() => { lr.resume(); })
			// Abort completely if a problem
			.catch(err => { console.log('err: ', err); process.exit(); });
	});

	lr.on('end', () => {
		console.log('EOF');
		process.exit();
	});
}
