var express = require('express'),
    http = require('http'),
    projects = require('./lib/project-list'),
    snapshots = require('./lib/snapshots'),
    stubs = require('./lib/stubs'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    router = express.Router();

var config = exports.config = require('./config');

var installers = exports.installers = {};

var installer_paths = __dirname + '/lib/installers';
var walk = function (currentPath) {
    fs.readdirSync(currentPath).forEach(function (file) {
        var newPath = currentPath + '/' + file;
        var stat = fs.statSync(newPath);
        if (stat.isFile() && /(.*).(js$)/.test(file)) {
            installers[path.basename(file, '.js')] = require(newPath);
        }
    });
};
walk(installer_paths);

function startServer() {
    var app = express();
    require('./config/express')(app);

    async.series([
        stubs.load,
        snapshots.load,
        projects.load,
        projects.startAllAuto
    ], function (err) {
        if (err) {
            console.error('could not start ' + config.app.name);
            return console.error(err);
        }
        
        var server = http.Server(app);
        var port = config.port;
        server.listen(port);
        console.log(config.app.name + ' (' + process.env.NODE_ENV + ')' + ' started on port ' + port);

        process.on('SIGTERM', function () {
            console.log(config.app.name + ' shutting down.');
            server.close();
            projects.shutdown(function () {
                console.log('bye');
            });
        });
    });
}

if (!module.parent) {
    startServer();
}

exports.startServer = startServer;
