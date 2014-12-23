#!/usr/bin/env node
var path = require('path');
var program = require('commander');
var pkg = require(path.join(__dirname, '../package.json'));

program
    .version(pkg.version)
    .option('--home [path]', 'The directory to store tinkr related data.')
    .option('--port [port]', 'The port the daemon should listen on.');

program.parse(process.argv);
if (program.home) {
    process.env.TINKR_HOME = program.home;
}

if (program.port) {
    process.env.TINKR_PORT = program.port;
}

var tinkr = require(path.join(__dirname, '../server'));
tinkr.startServer();
