process.on('SIGTERM', () => {
	console.log('forever: Terminated');
	process.exit(0);
});

process.on('SIGINT', () => {
	console.log("forever: Ctrl-C received. Forever terminating");
	process.exit(0);
});

setInterval(() => { console.log('Still alive'); }, 5000);