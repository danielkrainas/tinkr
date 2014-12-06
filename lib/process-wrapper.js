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

            proc.restart();
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
            value: function (snapshot, start) {
                if (!proc.running) {
                    if (activeSnapshot && descriptor.hosting.installed) {
                        activeSnapshot.uninstall(proc.directory, function(err) {
                            if (err) {
                                return console.log(err);
                            }

                            proc.use(snapshot, start);
                        });
                    } else if (snapshot) {
                        var postInstall = function () {
                            if (start) {
                                proc.start();
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
                        proc.emit('change', null);
                    }
                } else {
                    var old = activeSnapshot;
                    proc.once('stopped', function () {
                        if (old) {
                            old.uninstall(proc.directory, function (err) {
                                if (err) {
                                    return console.log(err);
                                }

                                proc.use(snapshot, true);
                            });
                        } else {
                            proc.use(snapshot, true);
                        }
                    });

                    proc.stop();
                }
            }
        },

        start: {
            writeable: false,
            value: function () {
                if (!child && activeSnapshot && !delayTimeoutId) {
                    child = spawn(proc.command, proc.args, {
                        cwd: proc.directory,
                        env: _.merge({}, process.env, proc.env)
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

                    if (activeSnapshot.config.delay) {
                        delayTimeoutId = setTimeout(function () {
                            delayTimeoutId = null;
                            proc.emit('started');
                        }, activeSnapshot.config.delay);
                    } else {
                        proc.emit('started');
                    }
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
            value: function () {
                if (child) {
                    proc.once('stopped', function () {
                        proc.start();
                    });
                    
                    proc.stop();
                } else {
                    proc.start();
                }
            }
        },

        stop: {
            writeable: false,
            value: function () {
                if (child) {
                    child.kill();
                }
            }
        }
    });

    proc.use(snapshot, false);
};

util.inherits(ProcessWrapper, EventEmitter);

module.exports = ProcessWrapper;
