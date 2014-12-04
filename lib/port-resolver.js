var netstat = require('node-netstat');

exports.resolve = function (pid, callback) {
	netstat({}, function (item) {
		if (item.pid && item.pid == pid && item.protocol == 'tcp') {
			return callback(item.local.port);
		}
	});
};
