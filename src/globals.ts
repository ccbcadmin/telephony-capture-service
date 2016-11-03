export const pathSeparator = () => {
	if (/^win/.test(process.platform)) {
		return '\\';
	} else {

		// default to *nix system.
		return '/';
	}
}
