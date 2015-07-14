var express = require('express');
var http = require('http');
var https = require('https');
var interpolate = require('interpolate');
var Promise = require('bluebird');

var projects = require('./lib/project-list');
var snapshots = require('./lib/snapshots');
var relays = require('./lib/relays');
var configureExpress = require('./config/express');
var loadCredentials = require('./config/credentials');
var loadInstallers = require('./lib/installers');
var pm = require('./lib/process-manager');
var config = exports.config = require('./config');
var installers = exports.installers = loadInstallers();

function startServer() {
    var tasks = [
        relays.load(),
        snapshots.load(),
        projects.load(),
        projects.startAllAuto(),
        loadCredentials()
    ];


    Promise.all(tasks).then(function () {
        var httpsServer;
        var httpServer;
        var app;

        if (config.http.enabled) {
            app = express();
            configureExpress(app, config.http);
            httpServer = http.Server(app);
            httpServer.listen(config.http.port);
        }
        
        if (config.https.enabled) {
            app = express();
            configureExpress(app, config.https);
            httpsServer = https.createServer(config.https.credentials, app);
            httpsServer.listen(config.https.port);
        }
        
        console.log(interpolate('{name} ({env}) started.', {
            name: config.app.name,
            env: process.env.NODE_ENV
        }));

        if (config.https.enabled) {
            console.log(interpolate('HTTPS({port}): api={api} on={enabled}', config.https));
        }

        if (config.http.enabled) {
            console.log(interpolate('HTTP({port}): api={api} on={enabled}', config.http));
        }
    
        process.on('SIGTERM', function () {
            console.log(config.app.name + ' shutting down.');
            if (httpServer) {
                httpServer.close();
            }

            if (httpsServer) {
                httpsServer.close();
            }
            
            pm.shutdown(function () {
                console.log('bye');
            });
        });
    }).catch(function (err) {
        console.error('could not start ' + config.app.name);
        //console.error(err);
        console.log(err.stack);
    });
}

if (!module.parent) {
    startServer();
}

exports.startServer = startServer;
