var _ = require('lodash');
var interpolate = require('interpolate');

var ProcessWrapper = require('./process-wrapper');
var portResolver = require('./port-resolver');


var Project = function (descriptor, snapshots) {
	var project = this;
	var versions = {};
	var proc = null;
	var running = false;
	var activePort = 0;
	var startWhenReady = false;

	proc = new ProcessWrapper(descriptor, {
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

	var uninstallHandler = function (snapshot) {
		if (snapshot === project.snapshot) {
			descriptor.hosting.installed = false;
		}
	};

	var installHandler = function (snapshot) {
		if (snapshot === project.snapshot) {
			descriptor.hosting.installed = true;
		}
	};

	var snapshotAddedHandler = function (snapshot) {
		if (snapshot.project == descriptor.name) {
			project.addSnapshot(snapshot);
		}
	};

	var snapshotRemovedHandler = function (snapshot) {
		if (snapshot.project == descriptor.name) {
			project.removeSnapshot(snapshot);
		}
	};

	Object.defineProperties(this, {
		port: {
			get: function () {
				return activePort;
			}
		},

		hosting: {
			writable: false,
			value: function () {
				return descriptor.hosting;
			}
		},

		name: {
			get: function () {
				//return project.snapshot ? project.snapshot.toString() : descriptor.name;
				return descriptor.name;
			}
		},

		hostname: {
			get: function () {
				return project.snapshot ? project.snapshot.hostname : null;
			}
		},

		proxy: {
			get: function () {
				if (running) {
					var s = project.snapshot.proxy || 'http://localhost';
					if (s && activePort) {
						s += ':' + activePort;
					}

					return s;
				} else if (descriptor.hosting.proxy) {
					return descriptor.hosting.proxy;
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
				snapshots.on('added', snapshotAddedHandler);

				snapshots.on('removed', snapshotRemovedHandler);

	            snapshots.getAllFor(descriptor.name).forEach(function (snapshot) {
	                project.addSnapshot(snapshot);
	            });

	            if (descriptor.hosting.active) {
	            	this.useVersion(descriptor.hosting.active);
	            }
			}
		},

		dispose: {
			writable: false,
			value: function () {
				if (project.running) {
					project.stop();
				}

				snapshots.removeListener('added', snapshotAddedHandler);
				snapshots.removeListener('removed', snapshotRemovedHandler);
				project.disposeSnapshots();
			}
		},

		disposeSnapshots: {
			writable: false,
			value: function () {
				for (var version in versions) {
					var snapshot = versions[version];
					snapshot.removeListener('installed', installHandler);
					snapshot.removeListener('uninstalled', uninstallHandler);
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
				if (versionName && !(versionName in versions)) {
					return false;
				}

				if (project.snapshot && project.snapshot.version == versionName) {
					return true;
				}

				var snapshot = versions[versionName];
				project.hosting.active = versionName;
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

				snapshot.on('installed', installHandler);
				snapshot.on('uninstalled', uninstallHandler);
				console.log(interpolate('{name}: added snapshot {version}', { name: project.name, version: snapshot.version }));
				if (snapshot.version == project.hosting.active) {
					project.useVersion(snapshot.version);
				}
			}
		},

		removeSnapshot: {
			writable: false,
			value: function (snapshot) {
				if (snapshot.version in versions) {
					var finalize = function () {
						snapshot.removeListener('installed', installHandler);
						snapshot.removeListener('uninstalled', uninstallHandler);
						delete versions[snapshot.version];
					};

					if (project.snapshot && project.snapshot.version == snapshot.version) {
						proc.once('change', function () {
							finalize();
						});

						project.useVersion(null);
						/*project.useVersion(_(versions).keys(versions).filter(function (version) {
							return version != snapshot.version;
						}).valueOf()[0] || null);*/
					} else {
						finalize();
					}
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

Project.createDescriptor = function (info) {
	var defaults = {
		name: null,
		hosting: {
			proxy: null,
			domain: null,
			active: null,
			startup: 'manual',
			installed: false
		}
	};

	var descriptor = _.merge({}, defaults, {
		name: info.name,
		hosting: {
			domain: info.domain,
			proxy: info.proxy
		}
	});

	if (!descriptor.name) {
		throw new Error('name is required');
	}

	return descriptor;
};

module.exports = exports = Project;
