var fs = require('fs');
var path = require('path');
var installers = null;

module.exports = function () {
	if (installers) {
		return installers;
	}

	installers = {};
	var installerPaths = __dirname;
	fs.readdirSync(installerPaths).forEach(function (file) {
	    var filePath = installerPaths + '/' + file;
	    var stat = fs.statSync(filePath);
	    if (stat.isFile() && path.extname(file) === '.js' && path.basename(file) !== 'index.js') {
	        installers[path.basename(file, '.js')] = require(filePath);
	    }
	});

	return installers;
};