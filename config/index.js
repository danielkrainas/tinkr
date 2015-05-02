process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var _ = require('lodash');
var path = require('path');
var fs = require('fs');

var ensureLocalConfig = function (path) {
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, '{}');
    }
};

var config = module.exports = _.merge(
	require(__dirname + '/../config/env/all'),
	require(__dirname + '/../config/env/' + process.env.NODE_ENV) || {}
);

if (config.extraConfig) {
    config = module.exports = _.merge(config, require(config.extraConfig) || {});
} else {
    var localConfigPath = path.join(config.home, config.localConfig);
    ensureLocalConfig(localConfigPath);
    config = module.exports = _.merge(config, require(localConfigPath) || {});
}