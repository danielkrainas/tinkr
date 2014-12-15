var util = require('util');
var fse = require('fs-extra');
var _ = require('lodash');
var events = require('events');
var interpolate = require('interpolate');
var path = require('path');
var Datastore = require('nedb');

var ProcessWrapper = require('./process-wrapper');
var SnapshotWrapper = require('./snapshot-wrapper');
var config = require('../config');


var emitter = new events.EventEmitter();
var snapshots = [];
var db = new Datastore({ 
    filename: config.snapshotDataFile
});

module.exports = exports = emitter;

var _add = function (snapshot) {
    snapshots.push(snapshot);
};

exports.load = function (callback) {
    db.loadDatabase(function (err) {
        if (err) {
            return callback(err);
        }

        db.find({}, function (err, configs) {
            if (err) {
                return callback(err);
            }

            configs.forEach(function (config) {
                _add(new SnapshotWrapper(config));
                console.log(interpolate('snapshots: loaded {uid}', snapshot));
                emitter.emit('added', snapshot);
            });

            callback(null);
        });
    });
};

exports.add = function (settings, callback) {
    settings = exports.create(settings);
    if (!exports.getByApp(settings.project, settings.version)) {
        db.insert(settings, function (err, settings) {
            if (err) {
                return callback(err);
            }

            var snapshot = new SnapshotWrapper(settings);
            _add(snapshot);
            console.log(interpolate('snapshots: added {uid}', snapshot));
            emitter.emit('added', snapshot);
        });
    } else {
        callback(new Error('snapshot for that project and version already exists.'));
    }
};

exports.remove = function (projectName, version, callback) {
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
        db.remove({ _id: snapshot.config._id }, function (err) {
            if (err) {
                return callback(err);
            }

            snapshots.splice(match, 1);
            console.log(interpolate('snaphots: removed {uid}', snapshot));
            emitter.emit('removed', snapshot);
            callback(null, snapshot);
        });
    } else {
        callback();
    }
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

    if (typeof projectSettings.hosting.resolvePort !== 'undefined') {
        config.resolvePort = projectSettings.hosting.resolvePort;
    } else if (typeof projectSettings.hosting.port !== 'undefined') {
        config.port = projectSettings.hosting.port;
    }

    return new SnapshotWrapper(config);
};
