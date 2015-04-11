#!/usr/bin/env node
var path = require('path');
var program = require('commander');
var tinkr = require(path.join(__dirname, '../server'));


var runServer = true;

program
    .version(tinkr.config.pkg.version)
    .option('-h --home <path>', 'The directory to store tinkr related data.')
    .option('-u --user <user>', 'The user to use for the daemon.')
    .option('-p --port <port>', 'The port the http daemon should listen on.');


program.command('install <target>')
    .action(function (target) {
        runServer = false;
        var installer = tinkr.installers[target];
        if (!installer) {
            console.error('%s is not a supported target.', target);
            return;
        }

        installer.exec({
            user: program.user,
            port: program.port,
            home: program.home
        });
    });

program.parse(process.argv);
if (program.home) {
    tinkr.config.home = program.home;
}

if (program.port) {
    tinkr.config.port = program.port;
}

if (runServer) {
    tinkr.startServer();
}
