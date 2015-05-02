var express = require('express'),
    http = require('http'),
    https = require('https'),
    projects = require('./lib/project-list'),
    snapshots = require('./lib/snapshots'),
    stubs = require('./lib/stubs'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    configureExpress = require('./config/express'),
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
    async.series([
        stubs.load,
        snapshots.load,
        projects.load,
        projects.startAllAuto,
        function (callback) {
            if (config.https.enabled && config.https.credentials.pfx || config.https.credentials.cert) {
                return callback();
            }

            config.https.credentials.cert = [];
            config.https.credentials.key = [];

            var certificatesPath = path.join(config.home, config.certificatesFolder);
            fs.readdir(certificatesPath, function (err, files) {
                async.each(files, function (file, next) {
                    var newPath = certificatesPath + '/' + file;
                    var ext = path.extname(file).toLowerCase();
                    if (ext === '.pem' || ext === '.key') {
                        fs.readFile(newPath, function (err, content) {
                            if (err) {
                                return next(err);
                            }

                            var dest = 'cert';
                            if (ext[1] === 'k') {
                                dest = 'key';
                            }

                            config.https.credentials[dest].push(content);
                            next();
                        });
                    } else {
                        next();
                    }
                }, callback);
            });
        }
    ], function (err) {
        if (err) {
            console.error('could not start ' + config.app.name);
            return console.error(err);
        }

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
        
        console.log(config.app.name + ' (' + process.env.NODE_ENV + ')' + ' started on port ' + config.http.port + ' (ssl: ' + config.https.port + ')');
        process.on('SIGTERM', function () {
            console.log(config.app.name + ' shutting down.');
            if (httpServer) {
                httpServer.close();
            }

            if (httpsServer) {
                httpsServer.close();
            }
            
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
