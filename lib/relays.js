var util = require('util');
var _ = require('lodash');
var interpolate = require('interpolate');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');

var RelayWrapper = require('./relay-wrapper');
var config = require('../config');
var storage = require('./storage');

var _add = function (list, relay) {
    list.relays.push(relay);
};

var RelayList = function (collection) {
    this.relays = [];
    this.collection = collection;
};

util.inherits(RelayList, EventEmitter);

RelayList.prototype.RelayList = RelayList;

RelayList.prototype.load = function (callback) {
    var list = this;
    return new Promise(function (resolve, reject) {
        list.collection.find({}).then(function (metas) {
            metas.forEach(function (meta) {
                var relay = new RelayWrapper(RelayWrapper.createMeta(meta));
                _add(list, relay);
                console.log(interpolate('relays: loaded {name}', relay));
                list.emit('added', relay);
            });

            resolve(list);
        }).catch(reject);
    });
};

RelayList.prototype.add = function (relay, callback) {
    if (!~relays.indexOf(relay)) {
        var list = this;
        _add(this, relay);
        this.collection.insert(relay.meta).then(function (meta) {
            relay.meta = meta;
            console.log(interpolate('relays: added {name}', relay));
            list.emit('added', relay);
            callback(null, relay);
        }).catch(callback);
    } else {
        callback(new Error('relay already added.'));
    }
};

RelayList.prototype.remove = function (name, callback) {
    var match = -1;
    var list = this;
    for (var i = 0; i < this.relays.length; i++) {
        var s = this.relays[i];
        if (s.name == name) {
            match = i;
            break;
        }
    }

    if (match > -1) {
        var relay = this.relays[match];
        this.collection.remove({ _id: relay._id }).then(function () {
            list.relays.splice(match, 1);
            console.log(interpolate('relays: removed {name}', relay));
            list.emit('removed', relay);
            callback(null);
        }).catch(callback);
    } else {
        callback();
    }
};

RelayList.prototype.getByDomain = function (domain) {
    for (var i = 0; i < this.relays.length; i++) {
        if (this.relays[i].domain == domain) {
            return this.relays[i];
        }
    }

    return null;
};

RelayList.prototype.list = function () {
    return _(this.relays).pluck('meta').valueOf();
};

module.exports = new RelayList(storage.relays);
