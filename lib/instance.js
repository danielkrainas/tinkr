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
var generateToken = require('./token-generator');

var LOG_DIR = path.join(config.home, config.logFolder);
var PROJECT_DIR = path.join(config.home, config.projectFolder);

var STATE_RUNNING = 'running';
var STATE_IDLE = 'idle';
var STATE_MOUNTED = 'mounted';

var InstanceProcessObserver = function (process, instance) {
	var logFile = null;

	var cleanup = function () {
		if (logFile) {
			logFile.end();
		}

		logFile = null;
		instance._activePort = 0;
	};

	var startLogging = function () {
		var logPath = path.join(LOG_DIR, instance.project.name, instance.id);
		fse.ensureDirSync(logPath);
		logFile = fs.createWriteStream(path.join(logPath, new Date().getTime().toString() + config.logFileExtension), { flags: 'a' });
		process.internal.stdout.pipe(logFile);
		process.internal.stderr.pipe(logFile);
	};

	var onStarted = function () {
		startLogging();
	    if (process.snapshot && process.snapshot.config.resolvePort) {
	        resolvePort(process.pid, function (port) {
	        	instance._activePort = port;
	        	running = true;
	        	instance.emit('port', instance._activePort);
	        	instance.emit('started', instance);
	        });
	    } else if (process.snapshot) {
	    	running = true;
			instance._activePort = process.snapshot.port || 0;
			instance.emit('started', instance);
	    }
	};

	var onStopped = function () {
		cleanup();
		instance.emit('stopped', instance);
	};

	var onError = function (err) {
		cleanup();
		instance.emit('error', err);
	};

	var onStartFailed = function () {
		cleanup();
		instance.emit('error', new Error('failed to start'));
	};

	var onAutoRestart = function (state) {
		instance.emit('autorestart', _.merge({ instance: instance }, state));
		//console.log(interpolate('{name}: autorestarting ({restarts} of {maxRestarts})', _.merge({ name: wrapper.name }, state)));
	};

	var onAutoRestartLimit = function () {
		instance.emit('error', new Error('maximum auto-restarts attempted, will not try again.'));
	};

	var onStart = function () {
		instance.emit('start', instance);
	};

	process.on('start', onStart);
	process.on('started', onStarted);
	process.on('stopped', onStopped);
	process.on('error', onError);
	process.on('startfailed', onStartFailed);
	process.on('autorestart', onAutoRestart);
	process.on('autorestartlimit', onAutoRestartLimit);

	this.dispose = function () {
		process.removeListener('started', onStarted);
		process.removeListener('stopped', onStopped);
		process.removeListener('error', onError);
		process.removeListener('startfailed', onStartFailed);
		process.removeListener('autorestart', onAutoRestart);
		process.removeListener('autorestartlimit', onAutoRestartLimit);
	};
};

var Instance = function (project, snapshot) {
	EventEmitter.call(this);
	var id = generateToken(5);

	Object.defineProperties(this, {
		id: {
			writable: false,
			value: id
		},

		project: {
			writable: false,
			value: project
		},

		snapshot: {
			writable: false,
			value: snapshot
		},

		process: {
			writable: true,
			value: null
		},

		name: {
			writable: false,
			value: snapshot.toString() + ' #' + id
		},

		home: {
			writable: false,
			value: path.join(PROJECT_DIR, project.name + '-' + snapshot.version + '-' + id)
		}
	});
};

Instance.STATE_RUNNING = STATE_RUNNING;
Instance.STATE_IDLE = STATE_IDLE;
Instance.STATE_MOUNTED = STATE_MOUNTED;

util.inherits(Instance, EventEmitter);

Object.defineProperties(Instance.prototype, {
	_canStart: {
		value: false
	},

	_activePort: {
		value: 0
	},

	observer: {
		value: null
	},

	state: {
		get: function () {
			if (this.process && !this.process.running) {
				return STATE_MOUNTED;
			}

			return this.process && this.process.running ? STATE_RUNNING : STATE_IDLE;
		}
	}
});

Instance.prototype.mount = function () {
	if (this.state !== STATE_IDLE) {
		return Promse.reject(new Error('must be idle to mount.'));
	}

	var instance = this;
	instance.emit('install', instance);
	return this.snapshot.install(instance.home, {
		onRemove: function (file) {
			instance.emit('file.removed', file);
		},
		onCommand: function (cmd) {
			instance.emit('command.exec', cmd);
		},
		onCommandComplete: function (cmd) {
			instance.emit('command.complete', cmd);
		}
	}).then(function () {
		instance.process = new ProcessWrapper(instance.home, _.merge({}, {
			maxRestarts: instance.project.descriptor.maxRestarts,
			env: instance.snapshot.env,
		}, instance.project.startup));

		instance.observer = new InstanceProcessObserver(instance.process, instance);
		instance.emit('installed', instance);
		return instance;
	});
};

Instance.prototype.unmount = function () {
	if (this.state === STATE_IDLE) {
		return Promise.reject(new Error('cannot be idle'));
	}

	return this.stop().bind(this).then(function () {
		this.observer.dispose();
		this.observer = null;
		return this.snapshot.uninstall(this.home, {
			onRemove: function (file) {
				console.log('-' + file);
			}
		});
	}).then(Promise.resolve(this));
};

Instance.prototype.startWhenReady = function () {
	if (this.state !== STATE_RUNNING) {
		if (this.version) {
			return this.start();
		} else {
			this._canStart = true;
			return Promise.resolve(instance);
		}
	}

	return Promise.resolve(this);
};

Instance.prototype.restart = function () {
	if (this.state === STATE_RUNNING) {
		return this.stop().then(Promise.resolve(this));
	}

	return this.start().then(Promise.resolve(this));
};

Instance.prototype.start = function () {
	if (this.state !== STATE_RUNNING) {
		return this.process.start().then(Promise.resolve(this));
	}

	return Promise.resolve(this);
}

Instance.prototype.stop = function () {
	if (this.state === STATE_RUNNING) {
		return this.process.stop().then(Promise.resolve(this));
	}

	return Promise.resolve(this);
};

Instance.prototype.toString = function () {
	return this.name;
};

module.exports = Instance;