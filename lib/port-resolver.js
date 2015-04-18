var netstat = require('node-netstat');

exports.resolve = function (pid, callback) {
	netstat({
        filter: { pid: pid, protocol: 'tcp' }
    }, function (item) {
		callback(item.local.port);
	});
};
