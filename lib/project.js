var _ = require('lodash');
var interpolate = require('interpolate');

var ProcessWrapper = require('./process-wrapper');
var portResolver = require('./port-resolver');


var Project = function (meta, snapshots) {
	var project = this;
	var versions = {};
	var proc = null;
	var running = false;
	var activePort = 0;
	var startWhenReady = false;

	proc = new ProcessWrapper(meta, {
		autostart: false
	});

	proc.on('started', function () {
	    console.log(interpolate('{name}: started', project));
	    if (project.snapshot && project.snapshot.config.resolvePort) {
	        portResolver.resolve(proc.pid, function (port) {
	        	activePort = port;
	        	running = true;
	        	console.log(interpolate('{name}: resolved port: {port}', project));
	        });
	    } else if (project.snapshot) {
	    	running = true;
			activePort = project.snapshot.port || 0;
	    }
	});

	var cleanup = function () {
		running = false;
		activePort = 0;
	};

	proc.on('stopped', function () {
		cleanup();
	    console.log(interpolate('{name}: stopped', project));
	});

	proc.on('error', function () {
		cleanup();
	    console.log(interpolate('{name}: errored', project));
	});

	proc.on('change', function () {
		console.log(interpolate('{name}: version changed', project));
	});

	proc.on('autorestart', function (state) {
		console.log(interpolate('{name}: autorestarting ({restarts} of {maxRestarts})', _.merge({ name: wrapper.name }, state)));
	});

	proc.on('autorestartlimit', function () {
		console.log(interpolate('{name}: maximum auto-restarts attempted, will not try again.', project));
	});

	Object.defineProperties(this, {
		port: {
			get: function () {
				return activePort;
			}
		},

		meta: {
			writable: false,
			value: meta
		},

		name: {
			get: function () {
				return project.snapshot ? project.snapshot.toString() : meta.name;
			}
		},

		domain: {
			writable: false,
			value: meta.domain
		},

		proxy: {
			get: function () {
				if (running && project.snapshot.proxy) {
					var s = project.snapshot.proxy;
					if (activePort) {
						s += ':' + activePort;
					}

					return s;
				} else if (meta.proxy) {
					return meta.proxy;
				}

				return false;
			}
		},

		running: {
			get: function () {
				return running;
			}
		},

		init: {
			writable: false,
			value: function () {
				snapshots.on('added', function (snapshot) {
					if (snapshot.project == meta.name) {
						project.addSnapshot(snapshot);
					}
				});

				snapshots.on('removed', function (snapshot) {
					if (snapshot.project == meta.name) {
						project.removeSnapshot(snapshot);
					}
				});

	            snapshots.getAllFor(meta.name).forEach(function (snapshot) {
	                project.addSnapshot(snapshot);
	            });

	            if (meta.activeSnapshot) {
	            	this.useVersion(meta.activeSnapshot);
	            }
			}
		},

		snapshot: {
			get: function () {
				return proc ? proc.snapshot : null;
			}
		},

		useVersion: {
			writable: false,
			value: function (versionName) {
				if (!(versionName in versions)) {
					return false;
				}

				if (project.snapshot && project.snapshot.version == versionName) {
					return true;
				}

				var snapshot = versions[versionName];
				proc.use(snapshot, startWhenReady);
				startWhenReady = false;
				return true;
			}
		},

		addSnapshot: {
			writable: false,
			value: function (snapshot) {
				if (snapshot.version in versions) {
					throw new Error(interpolate('duplicate version for project: {name}', project));
				}

				versions[snapshot.version] = snapshot;
				console.log(interpolate('{name}: added snapshot {version}', { name: project.name, version: snapshot.version }));
				if (snapshot.version == meta.activeSnapshot) {
					project.useVersion(snapshot.version);
				}
			}
		},

		removeSnapshot: {
			writable: false,
			value: function (snapshot) {
				if (snapshot.version in versions) {
					if (project.snapshot && project.snapshot.version == snapshot.version) {
						project.useVersion(_(versions).keys(versions).filter(function (version) {
							return version != snapshot.version;
						}).valueOf()[0] || null);
					}

					delete versions[snapshot.version];
				}
			}
		},

		start: {
			writable: false,
			value: function (autostart) {
				if (project.snapshot && !running) {
					console.log(interpolate('{name}: starting', project));
					proc.start();
				} else if (!running && autostart) {
					startWhenReady = true;
				}
			}
		}, 
		stop: {
			writable: false,
			value: function () {
				if (running) {
					console.log(interpolate('{name}: stopping', project));
					proc.stop();
				}
			}
		},
		restart: {
            writeable: false,
            value: function () {
                if (running) {
                    project.stop();
                    proc.once('stopped', project.start);
                } else {
                    project.start();
                }
            }
		},
		toString: {
			writable: false,
			value: function () {
				return project.name;
			}
		}
	});
};

Project.createMeta = function (meta) {
	var defaultMeta = {
		name: null,
		home: null,
		proxy: null,
		activeSnapshot: null,
		domain: null
	};

	meta = _.merge({}, defaultMeta, meta);

	if (!meta.name) {
		throw new Error('name is required');
	}

	return meta;
};

module.exports = exports = Project;
