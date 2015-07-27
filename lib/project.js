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

		init: {
			writable: false,
			value: function (callback) {
				snapshots.on('added', snapshotAddedHandler);

				snapshots.on('removed', snapshotRemovedHandler);

	            async.eachSeries(snapshots.getAllFor(descriptor.name), function (snapshot, callback) {
	                project.addSnapshot(snapshot, callback);
	            }, callback);/*function () {
		            if (descriptor.hosting.active) {
		            	project.useVersion(descriptor.hosting.active, callback);
		            } else {
		            	callback();
		            }
	            });*/
			}
		},

		dispose: {
			writable: false,
			value: function () {
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
				callback();
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
