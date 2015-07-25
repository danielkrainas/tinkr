var util = require('util');
var wildcard = require('wildcard');
var async = require('async');
var interpolate = require('interpolate');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');

var storage = require('./storage');
var snapshots = require('./snapshots');
var Project = require('./project');
var pm = require('./process-manager');


var _add = function (list, descriptor, callback) {
    var project = new Project(descriptor, list.snapshots);
    project.on('modified', list.saveOnModify);
    project.init(function () {
        list.loaded[project.name] = project;
        if (list.autostart && project.snapshot) {
            project.start(function () {
                callback(project);
            });
        } else {
            callback(project);
        }
    });

    return project;
};

var createSaveOnModify = function (list) {
    return function (project) {
        list.collection.update({ name: project.name }, { $set: project.descriptor }).then(function () {
            console.log(interpolate('projects: {name} saved.', project));
        }).catch(function (err) {
            console.log('projects: saveOnModify: ' + err.toString());
        });
    };
};

var ProjectList = function (collection, snapshots) {
    var list = this;
    this.saveOnModify = createSaveOnModify(this);
    this.autostart = false;
    this.snapshots = snapshots;
    this.loaded = {};
    this.collection = collection;
    this.domainMap = {};
};

util.inherits(ProjectList, EventEmitter);

ProjectList.prototype.ProjectList = ProjectList;

ProjectList.prototype.getByName = function (name) {
    return this.loaded[name] || null;
};

ProjectList.prototype.getByDomain = function (hostname) {
    var domains = Object.keys(this.domainMap);
    for (var i = 0; i < domains.length; i++) {
        var domain = domains[i];
        if (domain == hostname || wildcard(domain, hostname)) {
            return this.domainMap[domain];
        }
    }

    return null;
};

ProjectList.prototype.listDescriptors = function () {
    return _.pluck(_.values(this.loaded), 'descriptor');
};

ProjectList.prototype.list = function () {
    return _.values(this.loaded);
};

ProjectList.prototype.startAllAuto = function () {
    var list = this;
    this.autostart = true;
    return new Promise(function (resolve, reject) {
        async.eachSeries(_.values(list.loaded), function (project, callback) {
            if (project.hosting.startup === 'auto') {
                console.log('here');
                var i = pm.load(project);
                i.startWhenReady();
                callback();
            } else {
                callback();
            }
        }, function (err) {
            if (err) {
                return reject(err);
            }

            resolve();
        });
    });
};

ProjectList.prototype.add = function (descriptor, callback) {
    var list = this;
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
        this.collection.insert(descriptor).then(function (descriptor) {
            _add(list, descriptor, function (project) {
                callback(null, project);
                console.log(interpolate('projects: added {name}', descriptor));
                list.emit('added', project);
            });
        }).catch(callback);
    }
};

ProjectList.prototype.remove = function (name, callback) {
    var i = 0;
    var match = null;

    var project = this.getByName(name);
    if (!project) {
        callback();
    }

    project.removeListener('modified', this.saveOnModify);
    this.collection.remove({ name: project.name }).then(function (err) {
        if (err) {
            return callback(err);
        }

        project.dispose();
        projects.splice(projects.indexOf(project), 1);
        console.log(interpolate('projects: removed {name}', project));
        callback(null, project);
    });
};

ProjectList.prototype.load = function () {
    var list = this;
    return new Promise(function (resolve, reject) {
        list.collection.find({}).then(function (descriptors) {
            descriptors.forEach(function (descriptor) {
                _add(list, descriptor, function (project) {
                    console.log(interpolate('projects: loaded {name}', project));
                });
            });

            resolve(this);
        }).catch(function (err) {
            reject(err);
        });
    });
};

module.exports = new ProjectList(storage.projects, snapshots);
