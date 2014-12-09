var util = require('util');
var fse = require('fs-extra');
var _ = require('lodash');
var events = require('events');
var interpolate = require('interpolate');
var path = require('path');

var ProcessWrapper = require('./process-wrapper');
var SnapshotWrapper = require('./snapshot-wrapper');
var config = require('../config');


var emitter = new events.EventEmitter();
var CONFIG_FILE = path.join(config.dataFolder, 'snapshots.json');
var SAVE_TIMEOUT = 1000;
var snapshots = [];
var saveTimeout = null;

module.exports = exports = emitter;

exports.load = function () {
    if (!fse.existsSync(CONFIG_FILE)) {
        return;
    }
    
    fse.readJson(CONFIG_FILE, function (err, configs) {
        if (err) {
            throw err;
        }

        configs.forEach(function (config) {
            exports.add(new SnapshotWrapper(config));
        });
    });
};

exports.add = function (snapshot, persist) {
    if (_.isPlainObject(snapshot)) {
        snapshot = exports.create(snapshot);
    }

    if (!~snapshots.indexOf(snapshot)) {
        snapshots.push(snapshot);
        console.log(interpolate('snapshots: added {uid}', snapshot));
        emitter.emit('added', snapshot);
        if (persist) {
            exports.save();
        }
    }
};

exports.remove = function (projectName, version, persist) {
    var match = -1;
    for (var i = 0; i < snapshots.length; i++) {
        var s = snapshots[i];
        if (s.project == projectName && s.version == version) {
            match = i;
            break;
        }
    }

    if (match > -1) {
        var snapshot = snapshots[match];
        snapshots.splice(match, 1);
        emitter.emit('removed', snapshot);
        if (persist) {
            exports.save();
        }

        console.log(interpolate('snaphots: removed {uid}', snapshot));
    }

    return true;
};

exports.getByApp = function (projectName, version) {
    for (var i = 0; i < snapshots.length; i++) {
        var s = snapshots[i];
        if (s.project == projectName && s.version == version) {
            return s;
        }
    }

    return null;
};

exports.getAllFor = function (projectName) {
    var results = [];
    snapshots.forEach(function (snapshot) {
        if (snapshot.project == projectName) {
            results.push(snapshot);
        }
    });

    return results;
};

exports.list = function () {
    return _(snapshots).pluck('config').valueOf();
};

var save = exports.save = function () {
    fse.outputJson(CONFIG_FILE, exports.list(), function (err) {
        if (err) {
            throw err;
        }
    });
};

exports.scheduleSave = function () {
    if (!saveTimeout) {
        saveTimeout = setTimeout(save, SAVE_TIMEOUT);
    }
};

exports.create = function (projectSettings) {
    var config = {
        project: projectSettings.name,
        version: projectSettings.version,
        proxy: projectSettings.hosting.proxy,
        install: projectSettings.hosting.install,
        command: projectSettings.startup.command,
        args: projectSettings.startup.args,
        delay: projectSettings.startup.delay,
        env: {}
    };

    if (typeof projectSettings.resolvePort !== 'undefined') {
        config.resolvePort = projectSettings.hosting.resolvePort;
    } else {
        config.port = projectSettings.hosting.port;
    }

    return new SnapshotWrapper(config);
};
