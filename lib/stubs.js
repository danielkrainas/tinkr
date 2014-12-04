var util = require('util');
var fse = require('fs-extra');
var _ = require('lodash');
var events = require('events');
var interpolate = require('interpolate');
var path = require('path');

var StubWrapper = require('./stub-wrapper');
var config = require('../config');


var emitter = new events.EventEmitter();
var CONFIG_FILE = path.join(config.dataFolder, 'stubs.json');
var stubs = [];

module.exports = exports = emitter;

exports.load = function () {
    if (!fse.existsSync(CONFIG_FILE)) {
        return;
    }

    fse.readJson(CONFIG_FILE, function (err, metas) {
        if (err) {
            throw err;
        }

        metas.forEach(function (meta) {
            exports.add(new StubWrapper(StubWrapper.createMeta(meta)));
        });
    });
};

exports.add = function (stub, persist) {
    if (!~stubs.indexOf(stub)) {
        stubs.push(stub);
        console.log(interpolate('stubs: added {name}', stub));
        emitter.emit('added', stub);
        if (persist) {
            exports.save();
        }
    }
};

exports.remove = function (name, persist) {
    var match = -1;
    for (var i = 0; i < stubs.length; i++) {
        var s = stubs[i];
        if (s.name == name) {
            match = i;
            break;
        }
    }

    if (match > -1) {
        var stub = stubs[match];
        stubs.splice(match, 1);
        emitter.emit('removed', stub);
        if (persist) {
            exports.save();
        }

        console.log(interpolate('stubs: removed {name}', stub));
    }

    return true;
};

exports.getByDomain = function (domain) {
    for (var i = 0; i < stubs.length; i++) {
        if (stubs[i].domain == domain) {
            return stubs[i];
        }
    }

    return null;
};

exports.list = function () {
    return _(stubs).pluck('meta').valueOf();
};

exports.save = function () {
    fse.outputJson(CONFIG_FILE, exports.list(), function (err) {
        if (err) {
            throw err;
        }
    });
};
