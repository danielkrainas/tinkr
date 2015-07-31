var spawn = require('child_process').spawn;
var util = require('util');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var path = require('path');
var Promise = require('bluebird');

var config = require('../config');

var PROJECT_DIR = path.join(config.home, config.projectFolder);

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
                return path.join(PROJECT_DIR, descriptor.name);
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
                        return activeSnapshot.uninstall(proc.directory)
                            .then(function () {
                                return proc.use(snapshot, start);
                            });
                    } else if (snapshot) {
                        restarts = 0;
                        activeSnapshot = snapshot;
                        var installer = [];
                        if (!descriptor.hosting.installed) {
                            installer.push(snapshot.install(proc.directory));
                        } else {
                            console.log('already installed');
                        }

                        return Promise.all(installer).then(function () {
                            proc.emit('change', snapshot);
                            if (start) {
                                return proc.start();
                            }
                        });
                    } else {
                        restarts = 0;
                        activeSnapshot = null;
                        proc.emit('change', null);
                        return Promise.resolve();
                    }
                } else {
                    var old = activeSnapshot;
                    return proc.stop().then(function () {
                        var uninstaller = null;
                        if (old) {
                            uninstaller = old.uninstall(proc.directory);
                        }

                        return Promise.all(uninstaller).then(function () {
                            return proc.use(snapshot, true);
                        });
                    });
                }
            }
        },

        start: {
            writeable: false,
            value: function () {
                if (!child && activeSnapshot && !delayTimeoutId) {
                    return new Promise(function (resolve, reject) {
                        child = spawn(proc.command, proc.args, {
                            cwd: proc.directory,
                            env: _.merge({}, process.env, proc.env)
                        });

                        //console.log('environment: ');
                        //console.log(_.merge({}, process.env, proc.env));

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
                                resolve(proc);
                            } else {
                                proc.emit('startfailed');
                                reject();
                            }
                        }, delay);
                    });
                } else {
                    return Promise.resolve(proc);
                }
            }
        },

        pipeOutputTo: function (writableStream) {
            if (this.running) {
                child.stdout.pipe(writableStream);
                child.stderr.pipe(writableStream);
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
                    return proc.stop().then(function () {
                        return proc.start();
                    });
                }

                return proc.start();
            }
        },

        stop: {
            writeable: false,
            value: function () {
                if (child) {
                    return new Promise(function (resolve, reject) {
                        proc.once('stopped', function () {
                            resolve(proc);
                        });

                        child.kill();
                    });
                }

                return Promise.resolve(proc);
            }
        }
    });

    proc.use(snapshot, false, _.noop);
};

util.inherits(ProcessWrapper, EventEmitter);

module.exports = ProcessWrapper;
