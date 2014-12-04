var util = require('util');
var fse = require('fs-extra');
var jf = require('jsonfile');
var _ = require('lodash');
var events = require('events');
var path = require('path');

var Project = require('./project');
var snapshots = require('./snapshots');
var config = require('../config');


var emitter = new events.EventEmitter();
var CONFIG_FILE = path.join(config.dataFolder, 'projects.json');

module.exports = exports = emitter;

var projects = [],
    autostart = false;

exports.listMeta = function () {
    return _.pluck(projects, 'meta');
};

exports.list = function () {
    return projects;
};

exports.getByName = function (name) {
    for (var i = 0; i < projects.length; i++) {
        if (name == projects[i].meta.name) {
            return projects[i];
        }
    }

    return null;
};

exports.getByDomain = function (domain) {
    for (var i = 0; i < projects.length; i++) {
        if (domain == projects[i].meta.domain) {
            return projects[i];
        }
    }

    return null;
};

exports.add = function (meta, persist, callback) {
    var duplicateHost = false,
        duplicateName = false;

    var project = new Project(meta, snapshots);
    projects.forEach(function (p) {
        if (p.meta.domain == meta.domain) {
            duplicateHost = true;
        }

        if (p.meta.name == meta.name) {
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
        if (autostart && project.snapshot) {
            project.start();
        }

        if (persist) {
            jf.writeFile(CONFIG_FILE, this.listMeta(), function (err) {
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
    project.stop();

    if (persist) {
        jf.writeFile(CONFIG_FILE, metas, function (err) {
            callback(err);
        });
    } else {
        callback();
    }
};

exports.loadAll = function () {
    if (!fse.existsSync(CONFIG_FILE)) {
        return;
    }

    var projects = jf.readFileSync(CONFIG_FILE);
    for (var i = 0; i < projects.length; i++) {
        exports.add(projects[i], false, _.noop);
    }
};

exports.startAllAuto = function () {
    autostart = true;
    projects.forEach(function (project) {
        if (project.meta.startup === 'auto') {
            project.start(true);
        }
    });
};
