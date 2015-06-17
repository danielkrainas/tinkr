var util = require('util');
var _ = require('lodash');
var interpolate = require('interpolate');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');

var StubWrapper = require('./stub-wrapper');
var config = require('../config');
var storage = require('./storage');

var _add = function (list, stub) {
    list.stubs.push(stub);
};

var StubList = function (collection) {
    this.stubs = [];
    this.collection = collection;
};

util.inherits(StubList, EventEmitter);

StubList.prototype.StubList = StubList;

StubList.prototype.load = function (callback) {
    var list = this;
    return new Promise(function (resolve, reject) {
        list.collection.find({}).then(function (metas) {
            metas.forEach(function (meta) {
                var stub = new StubWrapper(StubWrapper.createMeta(meta));
                _add(list, stub);
                console.log(interpolate('stubs: loaded {name}', stub));
                list.emit('added', stub);
            });

            resolve(list);
        }).catch(reject);
    });
};

StubList.prototype.add = function (stub, callback) {
    if (!~stubs.indexOf(stub)) {
        var list = this;
        _add(this, stub);
        this.collection.insert(stub.meta).then(function (meta) {
            stub.meta = meta;
            console.log(interpolate('stubs: added {name}', stub));
            list.emit('added', stub);
            callback(null, stub);
        }).catch(callback);
    } else {
        callback(new Error('stub already added.'));
    }
};

StubList.prototype.remove = function (name, callback) {
    var match = -1;
    var list = this;
    for (var i = 0; i < this.stubs.length; i++) {
        var s = this.stubs[i];
        if (s.name == name) {
            match = i;
            break;
        }
    }

    if (match > -1) {
        var stub = this.stubs[match];
        this.collection.remove({ _id: stub._id }).then(function () {
            list.stubs.splice(match, 1);
            console.log(interpolate('stubs: removed {name}', stub));
            list.emit('removed', stub);
            callback(null);
        }).catch(callback);
    } else {
        callback();
    }
};

StubList.prototype.getByDomain = function (domain) {
    for (var i = 0; i < this.stubs.length; i++) {
        if (this.stubs[i].domain == domain) {
            return this.stubs[i];
        }
    }

    return null;
};

StubList.prototype.list = function () {
    return _(this.stubs).pluck('meta').valueOf();
};

module.exports = new StubList(storage.stubs);
