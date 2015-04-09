process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var _ = require('lodash');

module.exports = _.merge(
	require(__dirname + '/../config/env/all.js'),
	require(__dirname + '/../config/env/' + process.env.NODE_ENV + '.js') || {}
);