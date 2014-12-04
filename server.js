process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require('express'),
    http = require('http'),
    projects = require('./lib/project-list'),
    snapshots = require('./lib/snapshots'),
    stubs = require('./lib/stubs'),
    router = express.Router();

var config = require('./config');

var app = express();
require('./config/express')(app);

stubs.load();
snapshots.load();
projects.loadAll();
projects.startAllAuto();

var server = http.Server(app);
var port = config.port;
server.listen(port);
console.log(config.app.name + ' (' + process.env.NODE_ENV + ')' + ' started on port ' + port);
exports = module.exports = app;
