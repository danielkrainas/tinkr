var util = require('util');
var _ = require('lodash');
var interpolate = require('interpolate');
var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var async = require('async');

var ProcessWrapper = require('./process-wrapper');
var SnapshotWrapper = require('./snapshot-wrapper');
var storage = require('./storage');


var createSaveOnModify = function (list) {
    return function (snapshot) {
        list.collection.update({ _id: snapshot.config._id }, { $set: snapshot.config }).then(function () {
            console.log(interpolate('snapshots: {uid} saved.', snapshot));
        }).catch(function (err) {
            console.log('snapshots: saveOnModify: ' + err.toString());
        });
    };
};

var _add = function (list, snapshot) {
    snapshot.on('modified', createSaveOnModify(list));
    list.snapshots.push(snapshot);
};

var SnapshotList = function (collection) {
    EventEmitter.call(this);
    var list = this;
    this.snapshots = [];
    this.collection = collection;
};

SnapshotList.prototype.SnapshotList = SnapshotList;

SnapshotList.prototype.Snapshot = SnapshotWrapper;

util.inherits(SnapshotList, EventEmitter);

SnapshotList.prototype.load = function () {
    var list = this;
    return new Promise(function (resolve, reject) {
        list.collection.find({}).then(function (configs) {
            configs.forEach(function (config) {
                var snapshot = new SnapshotWrapper(config);
                _add(list, snapshot);
                console.log(interpolate('snapshots: loaded {uid}', snapshot));
                list.emit('added', snapshot);
            });

            resolve(list);
        }).catch(reject);
    });
};

SnapshotList.prototype.add = function (settings, project, callback) {
    if (!this.getByApp(settings.project, settings.version)) {
        var list = this;
        if (project.hosting.cloneEnv) {
            var latest = this.getLatestFor(settings.project);
            if (latest) {
                settings.env = _.clone(latest.config.env);
                console.log(interpolate('snapshots: cloned environment: {latest.uid} => {settings.project}#{settings.version}', {
                    latest: latest,
                    settings: settings
                }));
            }
        }

        this.collection.insert(settings).then(function (settings) {
            var snapshot = new SnapshotWrapper(settings);
            _add(list, snapshot);
            console.log(interpolate('snapshots: added {uid}', snapshot));
            list.emit('added', snapshot);
            callback(null, snapshot);
        }).catch(function (err) {
            callback(err);
        });
    } else {
        callback(new Error('snapshot for that project and version already exists.'));
    }
};

var _remove = function (snapshot, callback) {
    var list = this;
    snapshot.drop().then(function () {
        list.collection.remove({ _id: snapshot.config._id })
            .then(function () {
                list.snapshots.splice(list.snapshots.indexOf(snapshot), 1);
                console.log(interpolate('snaphots: removed {uid}', snapshot));
                list.emit('removed', snapshot);
                callback(null, snapshot);
            }).catch(callback);
    });
};

SnapshotList.prototype.removeAllFor = function (projectName, callback) {
    var targets = this.getAllFor(projectName);
    if (targets.length <= 0) {
        callback();
    } else {
        async.each(targets, _remove.bind(this), callback);
    }
};

SnapshotList.prototype.remove = function (projectName, version, callback) {
    var snapshot = this.getByApp(projectName, version);
    if (snapshot !== null) {
        _remove.call(this, snapshot, callback);
    } else {
        callback();
    }
};

SnapshotList.prototype.getByApp = function (projectName, version) {
    for (var i = 0; i < this.snapshots.length; i++) {
        var s = this.snapshots[i];
        if (s.project == projectName && s.version == version) {
            return s;
        }
    }

    return null;
};

SnapshotList.prototype.getAllFor = function (projectName) {
    var results = [];
    this.snapshots.forEach(function (snapshot) {
        if (snapshot.project == projectName) {
            results.push(snapshot);
        }
    });

    return results;
};

SnapshotList.prototype.getLatestFor = function (projectName) {
    var results = this.getAllFor(projectName).sort();
    if (results.length) {
        return results[results.length - 1];
    }

    return null;
};

SnapshotList.prototype.list = function () {
    return _(this.snapshots).pluck('config').valueOf();
};

SnapshotList.prototype.getSettingsFromProject = function (projectSettings) {
    var config = {
        project: projectSettings.name,
        version: projectSettings.version,
        proxy: projectSettings.hosting.proxy,
        install: projectSettings.hosting.install,
        command: projectSettings.startup.command,
        args: projectSettings.startup.args,
        delay: projectSettings.startup.delay,
        hostname: projectSettings.hosting.domain,
        env: {}
    };

    if (typeof projectSettings.hosting.resolvePort !== 'undefined') {
        config.resolvePort = projectSettings.hosting.resolvePort;
    } else if (typeof projectSettings.hosting.port !== 'undefined') {
        config.port = projectSettings.hosting.port;
    }

    return config;
};

module.exports = new SnapshotList(storage.snapshots);
