// Help out with Windows / *nix issues
export const pathSeparator = () => {
	if (/^win/.test(process.platform)) {
		return '\\';
	} else {
		return '/';
	}
}

// Return the machines local IP address
const ifs = require('os').networkInterfaces();
export const networkIP = Object.keys(ifs)
	.map(x => ifs[x].filter(x => x.family === 'IPv4' && !x.internal)[0])
	.filter(x => x)[0].address;

// RegExp to filter for files containing SMDR records
export const regExpSmdrFileName = /rw[0-9]{6,}.00[1-9]$/;
