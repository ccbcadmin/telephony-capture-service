const fs = require('fs');
const moment = require('moment');

let fd = fs.openSync('Data/SampleGenesisData.txt', 'w');

let pad = (num: number) =>
	num < 10 ? '0' + num : String(num);

let phoneNumbers: string[] = [];
for (let i = 0; i < 500; ++i) {

	let randomPhoneNumber: number;
	do {
		randomPhoneNumber = Math.floor(Math.random() * 10000000);
	} while (randomPhoneNumber < 1000000);

	phoneNumbers.push(String(randomPhoneNumber));
}

for (let i = 0; i < 90; ++i) {

	let callDate = moment().subtract(90 - i, 'days').format('YYYYMMDD');
	let dayOfWeek = moment().subtract(90 - i, 'days').day();

	let randomNumberOfCalls = Math.floor(Math.random() * 800) + 400;

	for (let j = 0; j < randomNumberOfCalls; ++j) {
		let startTime = Math.floor(Math.random() * 1440);
		let startHour = pad(Math.floor(startTime / 60));
		let startMinute = pad(startTime % 60);

		// Call duration max = 2 hours
		let callDuration = Math.floor(Math.random() * (86400 / 12));
		let callDurationHour = pad(Math.floor(callDuration / 3600));
		let callDurationMinute = pad(Math.floor((callDuration % 3600) / 60));
		let callDurationSeconds = pad(Math.floor(callDuration % 60));
		let dummyDepartment: string = '       ';
		let extensionNumber = 'extens#';
		let originalExtensionNumber = extensionNumber;
		let extensionType = ' ';
		let trunkMemberNumber = 'T123456';
		let truckType = 'TRNKT'
		let unused = '---';
		let accountCode = 'A/C=0123456789';
		let authorizationCode = 'AuthorizationC';
		let phoneNumber = phoneNumbers[Math.floor(Math.random() * 500)];
		let areaCode = (Number(phoneNumber) % 2) === 0 ? '604' : '778';
		let dialedDigits = areaCode + phoneNumber + '          ';
		let destinationCode = 'BC';
		let callDirection = 'I';
		let cityName = 'Vancouver ';
		let callType = '3';
		let operatorAssisted = '0';
		let callCosts = 'call$$';
		let surcharge = 'sur$$$';
		let markup = 'markup';
		let taxes = 'taxes$$$$$$$$$$$$$';
		let checkedOut = 'N';

		const line =
			callDate +
			startHour + startMinute + dayOfWeek +
			callDurationHour + callDurationMinute + callDurationSeconds +
			dummyDepartment + dummyDepartment + dummyDepartment + dummyDepartment +
			extensionNumber +
			originalExtensionNumber +
			extensionType +
			trunkMemberNumber +
			truckType +
			unused +
			accountCode +
			authorizationCode +
			dialedDigits +
			areaCode +
			destinationCode +
			callDirection +
			cityName +
			callType +
			operatorAssisted +
			callCosts +
			surcharge +
			markup +
			taxes +
			checkedOut +
			'\r\n';

		fs.writeSync(fd, line);
	}
}
