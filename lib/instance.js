var _ = require('lodash');
var util = require('util');
var interpolate = require('interpolate');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');

var ProcessWrapper = require('./process-wrapper');
var resolvePort = require('./port-resolver');
var config = require('../config');


var Instance = function (project) {
	EventEmitter.call(this);
	var instance = this;
	var running = false;
	var activePort = 0;
	var logFile = null;
	var startWhenReady = false;
	var proc = new ProcessWrapper(project.descriptor, {
		autostart: false
	});

	var returnInstance = function () {
		return instance;
	};

	var cleanup = function () {
		if (logFile) {
			logFile.end();
		}

		logFile = null;
		running = false;
		activePort = 0;
	};

	var startLogging = function () {
		var logPath = path.join(config.logFolder, project.name);
		fse.ensureDirSync(logPath);
		logFile = fs.createWriteStream(path.join(logPath, new Date().getTime().toString(), '.log'), { flags: 'a' });
		proc.pipeOutputTo(logFile);
	};

	proc.on('started', function () {
		startLogging();
	    if (project.snapshot && project.snapshot.config.resolvePort) {
	        resolvePort(proc.pid, function (port) {
	        	activePort = port;
	        	running = true;
	        	instance.emit('port', activePort);
	        	instance.emit('started', instance);
	        });
	    } else if (project.snapshot) {
	    	running = true;
			activePort = project.snapshot.port || 0;
			instance.emit('started', instance);
	    }
	});

	proc.on('stopped', function () {
		cleanup();
		instance.emit('stopped', instance);
	});

	proc.on('error', function (err) {
		cleanup();
		instance.emit('error', err);
	});

	proc.on('startfailed', function () {
		cleanup();
		instance.emit('error', new Error('failed to start'));
	});

	proc.on('change', function (snapshot) {
		/*console.log(interpolate('{project.name}: version changed to {snapshot.version}', { 
			project: project,
			snapshot: snapshot,
			instance: instance
		}));*/

		project.setActive(snapshot.version);
		instance.emit('change', {
			project: project,
			snapshot: snapshot,
			instance: instance
		});
	});

	proc.on('autorestart', function (state) {
		instance.emit('autorestart', _.merge({ instance: instance }, state));
		//console.log(interpolate('{name}: autorestarting ({restarts} of {maxRestarts})', _.merge({ name: wrapper.name }, state)));
	});

	proc.on('autorestartlimit', function () {
		instance.emit('error', new Error('maximum auto-restarts attempted, will not try again.'));
	});

	Object.defineProperties(instance, {
		project: {
			get: function () {
				return project;
			}
		},

		state: {
			get: function () {
				return running ? 'running' : 'stopped';
			}
		},

		use: {
			writable: false,
			value: function (version) {
				if (version && !(project.versions[version])) {
					return Promise.reject(new Error(interpolate('snapshot {0} not found.', [version])));
				}

				if (project.snapshot && project.snapshot.version == version) {
					return Promise.resolve(instance);
				}

				var snapshot = project.versions[version];
				return proc.use(snapshot, startWhenReady).then(function () {
					startWhenReady = false;
					return instance;
				});
			}
		},

		startWhenReady: {
			writable: false,
			value: function () {
				if (!running) {
					if (project.snapshot) {
						return instance.start();
					} else {
						startWhenReady = true;
						return Promise.resolve(instance);
					}
				} else {
					return Promise.resolve(instance);
				}
			}
		},

		start: {
			writable: false,
			value: function () {
				if (project.snapshot) {
					console.log(interpolate('{name}: starting', project));
					return proc.start().then(returnInstance);
				} else if (!running) {
					return Promise.reject(new Error('cannot start project, no snapshot selected'));
				} else {
					return Promise.resolve(instance);
				}
			}
		},

		stop: {
			writable: false,
			value: function () {
				if (running) {
					return proc.stop().then(returnInstance);
				}

				return Promise.resolve(instance);
			}
		},

		restart: {
            writeable: false,
            value: function () {
            	if (running) {
            		return instance.stop().then(returnInstance);
            	}

            	return instance.start().then(returnInstance);
            }
		}
	});
};

util.inherits(Instance, EventEmitter);

module.exports = Instance;