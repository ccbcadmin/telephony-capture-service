export const pathSeparator = () => {
	if (/^win/.test(process.platform)) {
		return '\\';
	} else {
		return '/';
	}
}
