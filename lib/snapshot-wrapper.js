var _ = require('lodash');
var exec = require('child_process').exec;
var path = require('path');
var AdmZip = require('adm-zip');
var fse = require('fs-extra');
var async = require('async');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var config = require('../config');


var SNAPSHOTS_DIR = path.join(config.home, config.snapshotFolder);

var clearOrCreateDirectory = function (dir, callback) {
    fse.ensureDirSync(dir);
    fse.readdir(dir, function (err, files) {
        if (err) {
            return callback(err);
        }

        var work = [];
        files.forEach(function (file) {
            work.push(function (next) {
                fse.remove(path.join(dir, file), function (err) {
                    if (err) {
                        return next(err);
                    }

                    console.log('-removed: ' + file);
                    next();
                });
            });
        });

        async.series(work, function (err) {
            if (err) {
                return callback(err);
            }

            console.log('-cleaned');
            callback();
        });
    });
};

var defaultConfig = {
    project: null,
    version: null,
    proxy: null,
    install: [],
    command: null,
    args: [],
    env: []
};

var SnapshotWrapper = function (settings) {
    var snapshot = this;
    settings = _.merge({}, defaultConfig, settings);

    Object.defineProperties(this, {
        uid: {
            get: function () {
                return settings.project + '#' + settings.version;
            }
        },

        project: {
            get: function () {
                return settings.project;
            }
        },

        version: {
            get: function () {
                return settings.version;
            }
        },

        hostname: {
            get: function () {
                return settings.hostname;
            }
        },

        port: {
            get: function () {
                return settings.port;
            }
        },

        config: {
            writable: false,
            value: settings
        },

        install: {
            writable: false,
            value: function (home, callback) {
                console.log('installing');
                clearOrCreateDirectory(home, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    var zip = new AdmZip(path.join(SNAPSHOTS_DIR, snapshot.project + '-' + snapshot.version + '.zip'));
                    zip.extractAllTo(home, true);
                    if (settings.install) {
                        if (typeof settings.install === 'string') {
                            settings.install = [settings.install];
                        }

                        var work = [];
                        settings.install.forEach(function (command) {
                            work.push(function (done) {
                                console.log('-install command: ' + command);
                                exec(command, {
                                    cwd: home,
                                    env: process.env
                                }, done);
                            });
                        });

                        async.series(work, function (err) {
                            if (err) {
                                return callback(err);
                            }

                            console.log('installed');
                            snapshot.emit('installed', snapshot);
                            callback();
                        });
                    } else {
                        console.log('installed');
                        snapshot.emit('installed', snapshot);
                        callback();
                    }
                });
            }
        },

        uninstall: {
            writable: false,
            value: function (home, callback) {
                console.log('uninstalling');
                clearOrCreateDirectory(home, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    console.log('uninstalled');
                    snapshot.emit('uninstalled', snapshot);
                    callback();
                });
            }
        },

        store: {
            writable: false,
            value: function (file, callback) {
                var newPath = path.join(SNAPSHOTS_DIR, settings.project + '-' + settings.version + '.zip');
                fse.move(file.path, newPath, function (err) {
                    if (!err) {
                        console.log('stored binary: ' + newPath);
                    }
                    
                    callback(err);
                });
            }
        },

        drop: {
            writable: false,
            value: function (callback) {
                var binaryPath = path.join(SNAPSHOTS_DIR, settings.project + '-' + settings.version + '.zip');
                fse.remove(binaryPath, function (err) {
                    if (!err) {
                        console.log('dropped binary: ' + binaryPath);
                    }

                    callback(err);
                });
            }
        },

        toString: {
            writable: false,
            value: function () {
                return snapshot.uid;
            }
        },

        setEnv: {
            writable: false,
            value: function (key, value) {
                if (!key) {
                    return;
                }

                settings.env = settings.env || {};
                if (!value) {
                    delete settings.env[key];
                } else {
                    settings.env[key] = value;
                }

                snapshot.emit('modified', snapshot);
            }
        }
    });
};

util.inherits(SnapshotWrapper, EventEmitter);

module.exports = exports = SnapshotWrapper;
