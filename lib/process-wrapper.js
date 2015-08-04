var spawn = require('child_process').spawn;
var util = require('util');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');

var ProcessWrapper = function (home, options) {
    EventEmitter.call(this);
    options = options || {};
    options.maxRestarts = options.maxRestarts || 3;
    Object.defineProperties(this, {
        _delayTimeoutId: {
            value: null
        },

        _restarts: {
            value: 0
        },

        pid: {
            get: function () {
                return this.internal ? this.internal.pid : null;
            }
        },

        running: {
            get: function () {
                return !!this.internal;
            }
        },

        internal: {
            writable: true,
            value: null
        },

        home: {
            writable: false,
            value: home
        },

        options: {
            writable: false,
            value: options
        },

        args: {
            enumerable: true,
            value: options.args
        },

        command: {
            writeable: false,
            value: options.command
        },

        env: {
            writeable: false,
            value: options.env
        }
    });
};

util.inherits(ProcessWrapper, EventEmitter);

ProcessWrapper.prototype.performAutoRestart = function () {
    if (this.options.autoRestart && this._restarts < this.options.maxRestarts) {
        this._restarts++;
        this.emit('autorestart', {
            restarts: this._restarts,
            maxRestarts: this.options.maxRestarts
        });

        return this.restart();
    } else if (this.options.autoRestart) {
        this.emit('autorestartlimit');
        return Promise.reject();
    }
};

ProcessWrapper.prototype.restart = function () {
    if (this.internal) {
        return proc.stop().bind(this).then(this.start);
    }

    return proc.start();
}

ProcessWrapper.prototype.cleanup = function () {
    this.internal = null;
};

ProcessWrapper.prototype.start = function () {
    if (!this.running && !this._delayTimeoutId) {
        var wrapper = this;
        var child = wrapper.internal = spawn(wrapper.command, wrapper.args, {
            cwd: wrapper.home,
            env: _.merge({}, process.env, wrapper.env)
        });

        //console.log('environment: ');
        //console.log(_.merge({}, process.env, proc.env));

        child.on('exit', function () {
            wrapper.cleanup();
            wrapper.emit('stopped', wrapper);
        });

        child.on('error', function (err) {
            if (err) {
                console.error(err);
            }

            wrapper.cleanup();
            wrapper.emit('error');
            wrapper.performAutoRestart();
        });

        wrapper.emit('start', wrapper);
        return new Promise(function (resolve, reject) {
            var delay = wrapper.options.delay || 5000;
            wrapper._delayTimeoutId = setTimeout(function () {
                if (wrapper.internal) {
                    wrapper._delayTimeoutId = null;
                    wrapper.emit('started');
                    resolve(wrapper);
                } else {
                    wrapper.emit('startfailed');
                    reject();
                }
            }, delay);
        });
    }
    
    return Promise.resolve(this);
};

ProcessWrapper.prototype.stop = function () {
    if (this.internal) {
        return new Promise(function (resolve, reject) {
            this.once('stopped', function (wrapper) {
                wrapper._restarts = 0;
                resolve(wrapper);
            });

            this.internal.kill();
        });
    }

    return Promise.resolve(this);
};

module.exports = ProcessWrapper;
