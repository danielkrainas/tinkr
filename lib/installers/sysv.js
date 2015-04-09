var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

exports.exec = function (options) {
    var parts = ['#!/bin/sh', '# /etc/init.d/tinkrd', '#'];

    function exportNodeEnv(cmd) {
        return 'export NODE_ENV=production;' + cmd;
    }

    function wrapForUser(cmd) {
        if (options.user) {
            return 'su - ' + options.user + ' -c "' + cmd + '"';
        }

        return cmd;
    }

    var cmd = '/usr/bin/tinkrd';
    if (options.home) {
        cmd += ' --home=' + options.home;
    }

    if (options.port) {
        cmd += ' --port=' + options.port;
    }

    cmd += ' &';

    parts.push('case "$1" in');
    parts.push('  start)');
    parts.push('    ' + wrapForUser(exportNodeEnv(cmd)));
    parts.push('    ;;');
    parts.push('  daemon)');
    parts.push('    ' + wrapForUser(exportNodeEnv('nohup ' + cmd)));
    parts.push('    ;;');
    parts.push('  stop)');
    parts.push('    kill $(ps aux | grep \'[n]ode /usr/bin/tinkrd\' | awk \'{print $2}\')');
    parts.push('    ;;');
    parts.push('  *)');
    parts.push('    exit 1');
    parts.push('    ;;');
    parts.push('esac');
    parts.push('exit 0');
    fs.writeFileSync('/etc/init.d/tinkrd', parts.join('\n'));
    exec('chmod 0755 /etc/init.d/tinkrd', function (err) {
        console.log('/etc/init.d/tinkrd created.');
    });
};
