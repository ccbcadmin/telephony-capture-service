process.on('SIGTERM', () => {
    console.log('forever: Terminated');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log("forever: Ctrl-C received. Forever Terminated");
    process.exit(0);
});
console.log('Start cron');
spawn('cron');
setInterval(() => { console.log('Still alive'); }, 5000);
