var util = require('util');
var async = require('async');
var interpolate = require('interpolate');
var _ = require('lodash');
var events = require('events');
var path = require('path');
var Datastore = require('nedb');

var Project = require('./project');
var snapshots = require('./snapshots');
var config = require('../config');


var emitter = new events.EventEmitter();
var db = new Datastore({ 
    filename: config.projectDataFile
});

module.exports = exports = emitter;

var projects = [],
    store = null,
    autostart = false;

var saveOnModify = function (project) {
    db.update({ name: project.name }, { $set: project.descriptor }, function (err) {
        if (err) {
            console.log('projects: saveOnModify: ' + err.toString());
        } else {
            console.log(interpolate('projects: {name} saved.', project));
        }
    });
};

var _add = function (descriptor, callback) {
    var project = new Project(descriptor, snapshots);
    project.init(function () {
        project.on('modified', saveOnModify);
        projects.push(project);
        if (autostart && project.snapshot) {
            project.start(function () {
                callback(project);
            });
        } else {
            callback(project);
        }
    });
};

exports.listDescriptors = function () {
    return _.pluck(projects, 'descriptor');
};

exports.list = function () {
    return projects;
};

exports.getByName = function (name) {
    for (var i = 0; i < projects.length; i++) {
        if (name == projects[i].name) {
            return projects[i];
        }
    }

    return null;
};

exports.getByDomain = function (hostname) {
    for (var i = 0; i < projects.length; i++) {
        var project = projects[i];
        if (project.hostname && hostname == project.hostname) {
            return project;
        }
    }

    return null;
};

exports.add = function (descriptor, callback) {
    var duplicateHost = false,
        duplicateName = false;

    /*projects.forEach(function (p) {
        if (p.domain == project.domain) {
            duplicateHost = true;
        }

        if (p.name == project.name) {
            duplicateName = true;
        }
    });*/

    if (duplicateName) {
        callback(new Error('name already exists'));
    } else if (duplicateHost) {
        callback(new Error('domain name already in use'));
    } else {
        db.insert(descriptor, function (err, descriptor) {
            if (err) {
                return callback(err);
            }

            _add(descriptor, function (project) {
                callback(null, project);
                console.log(interpolate('projects: added {name}', descriptor));
            });
        });
    }
};

exports.remove = function (name, callback) {
    var i = 0,
        match = null;

    var project = this.getByName(name);
    if (!project) {
        callback();
    }

    project.removeListener('modified', saveOnModify);
    db.remove({ name: project.name }, function (err) {
        if (err) {
            return callback(err);
        }

        project.dispose();
        projects.splice(projects.indexOf(project), 1);
        console.log(interpolate('projects: removed {name}', project));
        callback(null, project);
    });
};

exports.load = function (callback) {
    db.loadDatabase(function (err) {
        if (err) {
            return callback(err);
        }

        db.find({}, function (err, descriptors) {
            if (err) {
                return callback(err);
            }

            async.eachSeries(descriptors, function (descriptor, callback) {
                _add(descriptor, function (project) {
                    console.log(interpolate('projects: loaded {name}', project));
                    callback();
                });
            }, function (err) {
                callback();
            });
        });
    });
};

exports.startAllAuto = function (callback) {
    autostart = true;
    async.eachSeries(projects, function (project, callback) {
        if (project.hosting.startup === 'auto') {
            project.startWhenReady(callback);
        } else {
            callback();
        }
    }, function () {
        callback();
    });
};
