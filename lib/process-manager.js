var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var util = require('util');

var snapshots = require('./snapshots');
var Instance = require('./instance');


var ProcessManager = function() {
	EventEmitter.call(this);
	this.instanceMap = {};
	this.instances = [];
};

util.inherits(ProcessManager, EventEmitter);

ProcessManager.prototype.ProcessManager = ProcessManager;

ProcessManager.prototype.getInstance = function (project) {
	return this.instanceMap[project] || null;
};

ProcessManager.prototype.unload = function (project) {
	var pm = this;
	var i = this.getInstance(project);
	if (i) {
		i.stop().finally(function () {
			i.removeAllListeners('started');
			i.removeAllListeners('error');
			i.removeAllListeners('stopped');
			i.removeAllListeners('changing');
			i.removeAllListeners('changed');
			i.removeAllListeners('port');
			delete pm.instanceMap[project];
			pm.instances.splice(pm.instances.indexOf(i), 1);
		});
	}
};

ProcessManager.prototype.shutdown = function (callback) {
    console.log('pm: stopping all active');
    async.eachSeries(this.instances, function (project, callback) {
        if (project.running) {
            project.stop(callback);
        } else {
            callback();
        }
    }, callback);
};

ProcessManager.prototype.load = function (project, version) {
	var pm = this;
	var i = this.getInstance(project);
	if (!i) {
		i = new Instance(project);
		this.instanceMap[project] = i;
		this.instances.push(i);
		i.on('error', function (err) {
			pm.emit('error', new Error(interpolate('{name}: {error}', { error: err, name: project.name })));
			pm.unload(project);
		});

		i.on('started', function () {
			console.log(interpolate('{name}: started', project));
			pm.emit('project.started', {
				instance: i,
				project: project
			});
		});

		i.on('stopped', function () {
			pm.emit('project.stopped', {
				instance: i,
				project: project
			});
		});

		i.on('port', function (port) {
			console.log(interpolate('{name}: resolved port: {port}', {
				name: project.name,
				port: port
			}));
		});

		i.on('changing', function (e) {
			pm.emit('activity', {
				subject: e.project,
				verb: 'changing',
				object: e.snapshot
			});
		});

		i.on('change', function (e) {
			pm.emit('activity', {
				subject: e.project,
				verb: 'change',
				object: e.snapshot
			});
		});
	}

	if (version) {
		i.use(version);
	}

	return i;
};

module.exports = new ProcessManager();
