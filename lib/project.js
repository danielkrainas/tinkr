var _ = require('lodash');
var async = require('async');
var util = require('util');
var interpolate = require('interpolate');
var EventEmitter = require('events').EventEmitter;


var Project = function (info, snapshots) {
	var project = this;
	var versionCount = 0;
	var versions = {};

	var snapshotAddedHandler = function (snapshot) {
		if (snapshot.project == info.name) {
			project.addSnapshot(snapshot, _.noop);
		}
	};

	var snapshotRemovedHandler = function (snapshot) {
		if (snapshot.project == info.name) {
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
				return info.hosting;
			}
		},

		startup: {
			get: function () {
				return info.startup;
			}
		},

		name: {
			get: function () {
				return info.name;
			}
		},

		versions: {
			get: function () {
				return versions;
			}
		},

		versionCount: {
			get: function () {
				return versionCount;
			}
		},

		descriptor: {
			get: function () {
				return info;
			}
		},

		init: {
			writable: false,
			value: function (callback) {
				snapshots.on('added', snapshotAddedHandler);
				snapshots.on('removed', snapshotRemovedHandler);

	            async.eachSeries(snapshots.getAllFor(info.name), function (snapshot, callback) {
	                project.addSnapshot(snapshot, callback);
	            }, callback);
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
				}

				versionCount = 0;
			}
		},

		addSnapshot: {
			writable: false,
			value: function (snapshot, callback) {
				if (snapshot.version in versions) {
					throw new Error(interpolate('duplicate version for project: {name}', project));
				}

				versions[snapshot.version] = snapshot;
				versionCount++;
				console.log(interpolate('{name}: added snapshot {version}', { name: project.name, version: snapshot.version }));
				callback();
			}
		},

		removeSnapshot: {
			writable: false,
			value: function (snapshot, callback) {
				if (snapshot.version in versions) {
					var finalize = function () {
						delete versions[snapshot.version];
						versionCount = Math.max(0, versionCount--);
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

		update: {
			writable: false,
			value: function (updatedMeta) {
				info.hosting = updatedMeta.hosting;
				info.startup = updatedMeta.startup;
				console.log(interpolate('{name}: metadata updated', project));
				this.emit('modified', this);
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
			relay: {},
			cloneEnv: true
		},
		startup: null
	};

	var hosting = info.hosting || {};
	var hostingRelay = hosting.relay;

	var descriptor = _.merge({}, defaults, {
		name: info.name,
		hosting: {
			maxRestarts: hosting.maxRestarts,
			install: hosting.install
		},

		startup: info.startup
	});

	if (hostingRelay) {
		descriptor.hosting.relay = {
			domain: hostingRelay.domain,
			destination: hostingRelay.destination
		};
	}

	if (hosting.hasOwnProperty('port')) {
		descriptor.hosting.port = hosting.port;
	} else if (hosting.hasOwnProperty('resolvePort')) {
		descriptor.hosting.resolvePort = hosting.resolvePort;
	}

	if (!descriptor.name) {
		throw new Error('name is required');
	}

	return descriptor;
};

util.inherits(Project, EventEmitter);

Project.prototype.hasVersion = function (version) {
	return this.versions.hasOwnProperty(version);
};

module.exports = exports = Project;
