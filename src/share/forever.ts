process.on('SIGTERM', () => {
	console.log('forever: Terminated');
	process.exit(0);
});

process.on('SIGINT', () => {
	console.log("forever: Ctrl-C received. Forever Terminated");
	process.exit(0);
});

console.log ('Start cron');
//const spawn = require('child_process').spawn;
spawn('cron');

// define postgres slots
//spawn ('barman receive-wal --create-slot pg1');
//spawn ('barman receive-wal --create-slot pg2');

setInterval(() => { console.log('Still alive'); }, 5000);
