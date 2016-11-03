"use strict";
exports.pathSeparator = () => {
    if (/^win/.test(process.platform)) {
        return '\\';
    }
    else {
        return '/';
    }
};
