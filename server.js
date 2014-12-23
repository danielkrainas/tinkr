process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require('express'),
    http = require('http'),
    projects = require('./lib/project-list'),
    snapshots = require('./lib/snapshots'),
    stubs = require('./lib/stubs'),
    async = require('async'),
    router = express.Router();

var config = require('./config');

var app = express();
require('./config/express')(app);

function startServer() {
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

    });
}

if (!module.parent) {
    startServer();
}

exports.startServer = startServer;
