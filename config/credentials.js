var config = require('./');
var Promise = require('bluebird');

module.exports = function () {
    if (config.https.enabled && config.https.credentials.pfx || config.https.credentials.cert) {
        return Promise.resolve();
    }

    config.https.credentials.cert = [];
    config.https.credentials.key = [];

    var certificatesPath = path.join(config.home, config.certificatesFolder);
    return new Promise(function (resolve, reject) {
        fs.readdir(certificatesPath, function (err, files) {
            async.each(files, function (file, next) {
                var newPath = certificatesPath + '/' + file;
                var ext = path.extname(file).toLowerCase();
                if (ext === '.pem' || ext === '.key') {
                    fs.readFile(newPath, function (err, content) {
                        if (err) {
                            return next(err);
                        }

                        var dest = 'cert';
                        if (ext[1] === 'k') {
                            dest = 'key';
                        }

                        config.https.credentials[dest].push(content);
                        next();
                    });
                } else {
                    next();
                }
            }, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(true)
                }
            });
        });
    });	
};
