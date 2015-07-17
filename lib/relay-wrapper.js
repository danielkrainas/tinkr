var interpolate = require('interpolate');
var _ = require('lodash');

var RelayWrapper = function (meta) {
    var relay = this;

    Object.defineProperties(this, {
        meta: {
            get: function () {
                return meta;
            }, 
            set: function (value) {
                meta = value;
            }
        },

        domain: {
            get: function () {
                return meta.relay.domain || meta.domain;
            }
        },

        name: {
            get: function () {
                return meta.name;
            }
        },

        destination: {
            get: function () {
                return meta.relay.destination;
            }
        }
    });
};

RelayWrapper.createMeta = function (meta) {
    var defaultMeta = {
        name: null,
        relay: {
            destination: null,
            domain: null
        }
    };

    meta = _.merge({}, defaultMeta, meta);

    if (!meta.name) {
        throw new Error('name is required');
    }

    if (!meta.relay.domain && !meta.domain) {
        throw new Error('you must specify a domain');
    }

    return meta;
};

module.exports = exports = RelayWrapper;
