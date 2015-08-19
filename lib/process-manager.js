var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var util = require('util');
var interpolate = require('interpolate');

var snapshots = require('./snapshots');
var Instance = require('./instance');


var ProcessManager = function() {
	EventEmitter.call(this);
	this.instances = [];
};

util.inherits(ProcessManager, EventEmitter);

ProcessManager.prototype.ProcessManager = ProcessManager;

ProcessManager.prototype.getInstance = function (project, version) {
	var instances = this.getAllInstances(project);
	if (!version && instances.length === 1) {
		return instances[0];
	}

	instances = instances.filter(function (i) {
		return i.version === version;
	});

	return instances.length > 0 ? instances[0] : null;
};

ProcessManager.prototype.getAllInstances = function (project) {
	return this.instances.filter(function (i) {
		return i.project === project;
	});
};

ProcessManager.prototype.unloadAll = function (instances) {
	var pm = this;
	return Promise.each(instances, function (instance) {
		return pm.unload(instance);
	});
};

ProcessManager.prototype.unload = function (instance) {
	var pm = this;
	return instance.stop().bind(instance)
	.then(instance.unmount)
	.finally(function () {
		instance.removeAllListeners('started');
		instance.removeAllListeners('error');
		instance.removeAllListeners('stopped');
		instance.removeAllListeners('install');
		instance.removeAllListeners('installed');
		instance.removeAllListeners('port');
		instance.removeAllListeners('file.removed');
		instance.removeAllListeners('command.exec');
		instance.removeAllListeners('command.complete');
		pm.instances.splice(pm.instances.indexOf(instance), 1);
	});
};

ProcessManager.prototype.shutdown = function (callback) {
	var pm = this;
    console.log('pm: unmounting all active');
    return Promise.each(this.instances, function (instance) {
    	return pm.unload(instance);
    }).then(Promise.resolve(true));
};

ProcessManager.prototype.load = function (project, snapshotOrVersion) {
	var pm = this;
	var snapshot = null;
	if (!snapshotOrVersion && project.versionCount === 1) {
		snapshot = project.versions[Object.keys(project.versions)[0]];
	} else if (typeof snapshotOrVersion === 'string') {
		snapshot = project.versions[snapshotOrVersion];
	} else { 
		snapshot = snapshotOrVersion;
	}

	if (!snapshot) {
		return Promise.reject(new Error('invalid snapshot'));
	}

	// eventually we can scale up to allow multiple instances of the same project/snapshot
	// but one is enough right now.
	var i = this.getInstance(project, snapshot.version);

	if (!i) {
		i = new Instance(project, snapshot);
		this.instances.push(i);
		i.on('error', function (err) {
			pm.emit('error', new Error(interpolate('{i.name}: {error}', { error: err, i: i })));
			pm.unload(project);
		});

		i.on('started', function () {
			console.log(interpolate('{name}: started', i));
		});

		i.on('install', function () {
			console.log(interpolate('{name}: installing', i))
		});

		i.on('installed', function () {
			console.log(interpolate('{name}: installed', i));
		});

		i.on('start', function () {
			console.log(interpolate('{name}: starting', i));
		});

		i.on('file.removed', function (file) {
			console.log(interpolate('{i.name}: file removed: {file}', { i: i, file: file }));
		});

		i.on('command.exec', function (cmd) {
			console.log(interpolate('{i.name}: cmd: {cmd}', { i: i, cmd: cmd }));
		});

		i.on('command.complete', function (cmd) {
			console.log(interpolate('{i.name}: cmd: {cmd}: completed', { i: i, cmd: cmd }));
		});

		i.on('stopped', function () {
			console.log(interpolate('{name}: stopped', i));
		});

		i.on('port', function (port) {
			console.log(interpolate('{name}: resolved port: {port}', {
				name: i,
				port: port
			}));
		});

		return i.mount();
	}

	return Promise.resolve(i);
};

module.exports = new ProcessManager();
