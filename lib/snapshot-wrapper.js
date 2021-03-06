var _ = require('lodash');
var exec = require('child_process').exec;
var path = require('path');
var AdmZip = require('adm-zip');
var fse = require('fs-extra');
var async = require('async');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');

var config = require('../config');
var readdirAsync = Promise.promisify(fse.readdir);
var removeFileAync = Promise.promisify(fse.remove);
var execAsync = Promise.promisify(exec);
var moveFileAsync = Promise.promisify(fse.move);


var SNAPSHOTS_DIR = path.join(config.home, config.snapshotFolder);

var clearOrCreateDirectory = function (dir, onRemove) {
    fse.ensureDirSync(dir);
    return Promise.all(readdirAsync(dir).each(function (file) {
        return removeFileAync(path.join(dir, file)).then(function () {
            onRemove(file);
        });
    }));
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
    EventEmitter.call(this);
    var snapshot = this;
    settings = _.merge({}, defaultConfig, settings);

    Object.defineProperties(this, {
        uid: {
            get: function () {
                return settings.project + '@' + settings.version;
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
        }
    });
};

util.inherits(SnapshotWrapper, EventEmitter);

SnapshotWrapper.prototype.install = function (home, options) {
    options = options || {};
    var onCommand = options.onCommand || _.noop;
    var onCommandComplete = options.onCommandComplete || _.noop;
    var config = this.config;
    var snapshot = this;
    var zip = new AdmZip(path.join(SNAPSHOTS_DIR, config.project + '-' + config.version + '.zip'));
    return clearOrCreateDirectory(home, options.onRemove || _.noop).then(function () {
        zip.extractAllTo(home, true);
        if (!config.install) {
            return Promise.resolve();
        } else if (typeof config.install === 'string') {
            config.install = [config.install];// todo: normalize somewhere else
        }

        var installers = config.install.map(function (command) {
            onCommand(command);
            return execAsync(command, {
                cwd: home,
                env: process.env,
            }).then(function () {
                return command;
            });
        });

        return Promise.each(installers, onCommandComplete);
    });
};

SnapshotWrapper.prototype.uninstall = function (home, options) {
    console.log('uninstalling');
    return clearOrCreateDirectory(home, options.onRemove || _.noop)
        .then(function () {
            console.log('uninstalled');
            snapshot.emit('uninstalled', snapshot);            
        });
};

SnapshotWrapper.prototype.store = function (file) {
    var newPath = path.join(SNAPSHOTS_DIR, this.config.project + '-' + this.config.version + '.zip');
    return moveFileAsync(file.path, newPath)
        .then(function () {
            console.log('stored binary: ' + newPath);
        });
};

SnapshotWrapper.prototype.drop = function () {
    var binaryPath = path.join(SNAPSHOTS_DIR, this.config.project + '-' + this.config.version + '.zip');
    return removeFileAync(binaryPath).then(function () {
        console.log('dropped binary: ' + binaryPath);
    });
};

SnapshotWrapper.prototype.setEnv = function (key, value) {
    if (!key) {
        return;
    }

    this.config.env = this.config.env || {};
    if (!value) {
        delete this.config.env[key];
    } else {
        this.config.env[key] = value;
    }
};

SnapshotWrapper.prototype.toString = function () {
    return this.uid;
};

module.exports = exports = SnapshotWrapper;
