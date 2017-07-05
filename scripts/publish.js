#!/usr/bin/env node
const {execSync} = require('child_process');
const packages = require('./mendel-packages');
const origCwd = process.cwd();

packages.forEach(pkgPath => {
    process.chdir(pkgPath);
    console.log(execSync('npm publish').toString().trim());
    process.chdir(origCwd);
});
