var path = require('path');
var config = require('../config/');
var _ = require('lodash');
var Datastore = require('nedb');
var Promise = require('bluebird');
var async = require('async');

var Collection = function (path, options) {
	options = options || {};
	this.loadFilter = options.loadFilter || null;
	this.loaded = false;
	this.db = new Datastore({
	    filename: path,
	    autoload: true
	});
};

Collection.prototype.find = function (query) {
	var collection = this;
	return new Promise(function (resolve, reject) {
		collection.db.find(query, function (err, results) {
			if (err) {
				reject(err);
			} else {
				resolve(results);
			}
		});
	});
};

Collection.prototype.remove = function (query) {
	var collection = this;
	return new Promise(function (resolve, reject) {
		collection.remove(query, function (err) {
			if (err) {
				reject(err);
			} else {
				resolve(true);
			}
		});
	});
};

Collection.prototype.insert = function (data) {
	var collection = this;
	return new Promise(function (resolve, reject) {
		collection.insert(data, function (err, item) {
			if (err) {
				reject(err);
			} else {
				resolve(item);
			}
		});
	});
};

Collection.prototype.update = function (query, update) {
	var collection = this;
	return new Promise(function (resolve, reject) {
		collection.update(query, update, function (err) {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
};

module.exports = {
	Collection: Collection,

	snapshots: new Collection(path.join(config.home, config.snapshotDataFile)),

	projects: new Collection(path.join(config.home, config.projectDataFile)),

	relays: new Collection(path.join(config.home, config.relayDataFile))
};
