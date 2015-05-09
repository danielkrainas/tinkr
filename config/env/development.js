var fs = require('fs');

module.exports = {
    https: {
        credentials: {
            pfx: fs.readFileSync(__dirname + '../../../test/ssl-certificate.pfx'),
            passphrase: 'password'
        }
    }
};