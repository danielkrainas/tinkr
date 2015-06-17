var _ = require('lodash');
var async = require('async');
var util = require('util');
var interpolate = require('interpolate');
var EventEmitter = require('events').EventEmitter;


var Project = function (descriptor, snapshots) {
	var project = this;
	var versions = {};
	var startWhenReady = false;

	var uninstallHandler = function (snapshot) {
		if (snapshot === project.snapshot) {
			descriptor.hosting.installed = false;
			project.emit('modified', project);
		}
	};

	var installHandler = function (snapshot) {
		if (snapshot === project.snapshot) {
			descriptor.hosting.installed = true;
			project.emit('modified', project);
		}
	};

	var snapshotAddedHandler = function (snapshot) {
		if (snapshot.project == descriptor.name) {
			project.addSnapshot(snapshot, _.noop);
		}
	};

	var snapshotRemovedHandler = function (snapshot) {
		if (snapshot.project == descriptor.name) {
			project.removeSnapshot(snapshot, _.noop);
		}
	};

	Object.defineProperties(this, {
		port: {
			get: function () {
				return activePort;
			}
		},

		hosting: {
			get: function () {
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

		versions: {
			get: function () {
				return versions;
			}
		},

		descriptor: {
			get: function () {
				return descriptor;
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
			value: function (callback) {
				snapshots.on('added', snapshotAddedHandler);

				snapshots.on('removed', snapshotRemovedHandler);

	            async.eachSeries(snapshots.getAllFor(descriptor.name), function (snapshot, callback) {
	                project.addSnapshot(snapshot, callback);
	            }, function () {
		            if (descriptor.hosting.active) {
		            	project.useVersion(descriptor.hosting.active, callback);
		            } else {
		            	callback();
		            }
	            });
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
			value: function (versionName, callback) {
				if (versionName && !(versionName in versions)) {
					return callback(new Error(interpolate('snapshot {0} not found.', [versionName])));
				}

				if (project.snapshot && project.snapshot.version == versionName) {
					return callback();
				}

				var snapshot = versions[versionName];
				proc.use(snapshot, startWhenReady, function (err) {
					if (err) {
						return callback(err);
					}

					startWhenReady = false;
					callback();
				});
			}
		},

		addSnapshot: {
			writable: false,
			value: function (snapshot, callback) {
				if (snapshot.version in versions) {
					throw new Error(interpolate('duplicate version for project: {name}', project));
				}

				versions[snapshot.version] = snapshot;

				snapshot.on('installed', installHandler);
				snapshot.on('uninstalled', uninstallHandler);
				console.log(interpolate('{name}: added snapshot {version}', { name: project.name, version: snapshot.version }));
				if (snapshot.version == project.hosting.active) {
					project.useVersion(snapshot.version, callback);
				} else {
					callback();
				}
			}
		},

		removeSnapshot: {
			writable: false,
			value: function (snapshot, callback) {
				if (snapshot.version in versions) {
					var finalize = function () {
						snapshot.removeListener('installed', installHandler);
						snapshot.removeListener('uninstalled', uninstallHandler);
						delete versions[snapshot.version];
						callback();
					};

					if (project.snapshot && project.snapshot.version == snapshot.version) {
						project.useVersion(null, function () {
							finalize();
						});
						/*project.useVersion(_(versions).keys(versions).filter(function (version) {
							return version != snapshot.version;
						}).valueOf()[0] || null);*/
					} else {
						finalize();
					}
				}
			}
		},

		setActive: {
			writable: false,
			value: function (version) {
				descriptor.hosting.active = version;
				project.emit('modified', project);
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
			installed: false,
			cloneEnv: true
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

util.inherits(Project, EventEmitter);

module.exports = exports = Project;
