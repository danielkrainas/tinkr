var util = require('util');
var interpolate = require('interpolate');
var _ = require('lodash');
var events = require('events');
var path = require('path');
var Pandri = require('pandri');

var Project = require('./project');
var snapshots = require('./snapshots');
var config = require('../config');


var emitter = new events.EventEmitter();
var CONFIG_FILE = path.join(config.dataFolder, 'projects.json');

module.exports = exports = emitter;

var projects = [],
    store = null,
    autostart = false;

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

exports.add = function (descriptor, persist, callback) {
    var duplicateHost = false,
        duplicateName = false;

    var project = new Project(descriptor, snapshots);
    projects.forEach(function (p) {
        if (p.domain == project.domain) {
            duplicateHost = true;
        }

        if (p.name == project.name) {
            duplicateName = true;
        }
    });

    if (duplicateName) {
        callback(new Error('name already exists'));
    } else if (duplicateHost) {
        callback(new Error('domain name already in use'));
    } else {
        project.init();
        projects.push(project);
        if (!store.get(project.name)) {
            store.set(project.name, descriptor);
        }
        
        if (autostart && project.snapshot) {
            project.start();
        }

        if (persist) {
            store.save(function (err) {
                callback(err);
            });
        } else {
            callback(null, project);
        }
    }
};

exports.remove = function (name, persist, callback) {
    var i = 0,
        match = null;

    var project = this.getByName(name);
    if (!project) {
        return;
    }

    projects.splice(projects.indexOf(project), 1);
    store.remove(project.name);
    project.stop();

    console.log(interpolate('projects: removed {name}', project));
    if (persist) {
        store.save(function (err) {
            callback(err);
        });
    } else {
        callback();
    }
};

exports.loadAll = function () {
    store = new Pandri('projects', CONFIG_FILE, function (err) {
        if (err) {
            return console.error(err);
        }

        _.keys(store._content).forEach(function (name) {
            exports.add(store._content[name], false, _.noop);
        });
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
