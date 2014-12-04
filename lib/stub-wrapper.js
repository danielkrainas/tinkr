var interpolate = require('interpolate');
var _ = require('lodash');

var StubWrapper = function (meta) {
    var stub = this;

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
                return meta.domain;
            }
        },

        name: {
            get: function () {
                return meta.name;
            }
        },

        proxy: {
            get: function () {
                return meta.proxy;
            }
        }
    });
};

StubWrapper.createMeta = function (meta) {
    console.log(meta);
    var defaultMeta = {
        name: null,
        proxy: null,
        domain: null
    };

    meta = _.merge({}, defaultMeta, meta);

    if (!meta.name) {
        throw new Error('name is required');
    }

    return meta;
};

module.exports = exports = StubWrapper;
