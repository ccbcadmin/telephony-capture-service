process.on('SIGTERM', () => {
    console.log('forever: Terminated');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log("forever: Ctrl-C received. Forever terminating");
    process.exit(0);
});
console.log('Start cron');
const spawn = require('child_process').spawn;
spawn('cron');
setInterval(() => { console.log('Still alive'); }, 5000);
