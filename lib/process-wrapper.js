var spawn = require('child_process').spawn;
var util = require('util');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var path = require('path');

var config = require('../config');


var ProcessWrapper = function (descriptor, options, snapshot) {
    options = options || {};
    var proc = this;
    var restarts = 0;
    var autorestart = options.autorestart || false;
    var activeSnapshot = null;
    var child = null;
    var delayTimeoutId = null;

    // proc is being called with .apply(proc)
    var performAutoRestart = function () {
        if (autorestart && restarts < proc.maxRestarts) {
            restarts++;
            proc.emit('autorestart', {
                restarts: restarts,
                maxRestarts: proc.maxRestarts
            });

            proc.restart(_.noop);
        } else if (autorestart) {
            proc.emit('autorestartlimit');
        }
    };

    Object.defineProperties(proc, {
        pid: {
            get: function () {
                return child ? child.pid : null;
            }
        },

        snapshot: {
            get: function () {
                return activeSnapshot;
            }
        },

        running: {
            get: function () {
                return !!child;
            }
        },

        name: {
            writeable: false,
            get: function () {
                return descriptor.name;
            }
        },

        directory: {
            writeable: false,
            get: function () {
                return path.join(config.projectFolder, descriptor.name);
            }
        },

        maxRestarts: {
            writeable: false,
            value: options.maxRestarts || 3
        },

        args: {
            writeable: false,
            get: function () {
                if (!activeSnapshot) {
                    return null;
                }

                return activeSnapshot.config.args;
            }
        },

        command: {
            writeable: false,
            get: function () {
                if (!activeSnapshot) {
                    return null;
                }
                
                return activeSnapshot.config.command;
            }
        },

        env: {
            writeable: false,
            get: function () {
                if (!activeSnapshot) {
                    return null;
                }
                
                return activeSnapshot.config.env || {};
            }
        },

        use: {
            writeable: false,
            value: function (snapshot, start, callback) {
                if (!proc.running) {
                    if (activeSnapshot && descriptor.hosting.installed) {
                        activeSnapshot.uninstall(proc.directory, function(err) {
                            if (err) {
                                return console.log(err);
                            }

                            proc.use(snapshot, start, callback);
                        });
                    } else if (snapshot) {
                        var postInstall = function () {
                            if (start) {
                                proc.start(callback);
                            } else {
                                callback();
                            }
                        };

                        restarts = 0;
                        activeSnapshot = snapshot;
                        if (!descriptor.hosting.installed) {
                            snapshot.install(proc.directory, function (err) {
                                if (err) {
                                    return console.log(err);
                                }

                                postInstall();
                            });
                        } else {
                            console.log('already installed');
                            postInstall();
                        }

                        proc.emit('change', snapshot);
                    } else {
                        restarts = 0;
                        activeSnapshot = null;
                        callback();
                        proc.emit('change', null);
                    }
                } else {
                    var old = activeSnapshot;
                    proc.stop(function () {
                        if (old) {
                            old.uninstall(proc.directory, function (err) {
                                if (err) {
                                    return console.log(err);
                                }

                                proc.use(snapshot, true, callback);
                            });
                        } else {
                            proc.use(snapshot, true, callback);
                        }                        
                    });
                }
            }
        },

        start: {
            writeable: false,
            value: function (callback) {
                if (!child && activeSnapshot && !delayTimeoutId) {
                    child = spawn(proc.command, proc.args, {
                        cwd: proc.directory,
                        env: _.merge({}, process.env, proc.env)
                    });

                    console.log('environment: ');
                    console.log(_.merge({}, process.env, proc.env));

                    child.stdout.on('data', function (data) {
                        console.log(data.toString());
                    });

                    child.stderr.on('data', function (data) {
                        console.log(data.toString());
                    });

                    child.on('exit', function () {
                        proc.cleanup();
                        proc.emit('stopped');
                    });

                    child.on('error', function (err) {
                        if (err) {
                            console.error(err);
                        }

                        proc.cleanup();
                        proc.emit('error');
                        performAutoRestart.apply(proc);
                    });

                    var delay = activeSnapshot.config.delay || 500;
                    delayTimeoutId = setTimeout(function () {
                        if (child) {
                            delayTimeoutId = null;
                            proc.emit('started');
                        } else {
                            proc.emit('startfailed');
                        }

                        callback();
                    }, delay);
                } else {
                    callback();
                }
            }
        },

        cleanup: {
            writeable: false,
            value: function() {
                if (child) {
                    child = null;
                }
            }
        },

        restart: {
            writeable: false,
            value: function (callback) {
                if (child) {
                    proc.stop(function () {
                        proc.start(callback);
                    });
                } else {
                    proc.start(callback);
                }
            }
        },

        stop: {
            writeable: false,
            value: function (callback) {
                if (child) {
                    proc.once('stopped', function () {
                        callback();
                    });

                    child.kill();
                }
            }
        }
    });

    proc.use(snapshot, false, _.noop);
};

util.inherits(ProcessWrapper, EventEmitter);

module.exports = ProcessWrapper;
