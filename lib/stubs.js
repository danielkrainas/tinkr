var util = require('util');
var fse = require('fs-extra');
var _ = require('lodash');
var events = require('events');
var interpolate = require('interpolate');
var path = require('path');
var Datastore = require('nedb');

var StubWrapper = require('./stub-wrapper');
var config = require('../config');


var emitter = new events.EventEmitter();
var stubs = [];
var db = new Datastore({ 
    filename: config.stubDataStore
});

module.exports = exports = emitter;

var _add = function (stub) {
    stubs.push(stub);
};

exports.load = function (callback) {
    db.loadDatabase(function (err) {
        if (err) {
            return callback(err);
        }

        db.find({}, function (err, metadata) {
            if (err) {
                return callback(err);
            }

            metadata.forEach(function (meta) {
                var stub = new StubWrapper(StubWrapper.createMeta(meta));
                _add(stub);
                console.log(interpolate('stubs: loaded {name}', stub));
                emitter.emit('added', stub);
            });

            callback();
        });
    });
};

exports.add = function (stub, callback) {
    if (!~stubs.indexOf(stub)) {
        _add(stub);
        db.insert(stub.meta, function (err, meta) {
            if (err) {
                return callback(err);
            }

            stub.meta = meta;
            console.log(interpolate('stubs: added {name}', stub));
            emitter.emit('added', stub);
            callback(null, stub);
        });
    } else {
        callback(new Error('stub already added.'));
    }
};

exports.remove = function (name, callback) {
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
        db.remove({ _id: stub._id }, function (err) {
            if (err) {
                return callback(err);
            }

            stubs.splice(match, 1);
            console.log(interpolate('stubs: removed {name}', stub));
            emitter.emit('removed', stub);
            callback(null);
        });
    } else {
        callback();
    }
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
