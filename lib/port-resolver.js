var netstat = require('node-netstat');

module.exports = function (pid, callback) {
	netstat({
        limit: 1,
		filter: { pid: pid, protocol: 'tcp' }
	}, function (item) {
		callback(item.local.port);
	});
};
