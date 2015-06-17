var netstat = require('node-netstat');

module.exports = function (pid, callback) {
	netstat({
		filter: { pid: pid, protocol: 'tcp' }
	}, function (item) {
		callback(item.local.port);
	});
};
