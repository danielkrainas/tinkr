var util = require('util');
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
    filename: config.stubDataStore
});

module.exports = exports = emitter;

var projects = [],
    store = null,
    autostart = false;

var _add = function (descriptor) {
    var project = new Project(descriptor, snapshots);
    project.init();
    projects.push(project);
    if (autostart && project.snapshot) {
        project.start();
    }
};

exports.listDescriptors = function () {
    return _.pluck(projects, 'status');
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

exports.getByDomain = function (domain) {
    for (var i = 0; i < projects.length; i++) {
        if (domain == projects[i].hosting.domain) {
            return projects[i];
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

            var project = _add(descriptor);
            callback(null, project);
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
    db.find({}, function (err, descriptors) {
        if (err) {
            return callback(err);
        }

        descriptors.forEach(function (descriptor) {
            _add(descriptor);
        });

        callback();
    });
};

exports.startAllAuto = function () {
    autostart = true;
    projects.forEach(function (project) {
        if (project.hosting.startup === 'auto') {
            project.start(true);
        }
    });
};
