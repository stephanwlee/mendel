#!/usr/bin/env node
const {execSync} = require('child_process');
const packages = require('./mendel-packages');
const KEYWORDS = ['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'];
const VERSION_REGEX = /^\d+\.\d+\.\d+(\.\S+|$)/;
const version = process.argv[2];

if (typeof version === 'undefined') {
    throw new Error(
        'Requires a version or one of the keywords (' + KEYWORDS.join() + ')'
    );
} else if (KEYWORDS.indexOf(version) < 0 && !VERSION_REGEX.test(version)) {
    throw new Error(
        'Requires a version to conform to "[0-9]+.[0-9]+.[0-9]+".'
    );
}

const origCwd = process.cwd();
packages.forEach(pkgPath => {
    process.chdir(pkgPath);
    try {
        console.log(
            pkgPath,
            execSync('npm version ' + version).toString().trim()
        );
    } catch (e) {
        /* DO NOTHING */
    }
    process.chdir(origCwd);
});
