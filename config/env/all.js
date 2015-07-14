var path = require('path');
var rootPath = path.normalize(__dirname + '/../..');
var homePath = process.env.TINKR_HOME || path.resolve(path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.\\.tinkr'));

module.exports = {
    pkg: require(path.join(rootPath, 'package.json')),

	root: rootPath,

    home: homePath,

    relayDataFile: 'relays.db',

    snapshotDataFile: 'snapshots.db',

    projectDataFile: 'projects.db',

    projectFolder: 'projects',

    snapshotFolder: 'snapshots',

    extraConfig: process.env.TINKR_CONFIG || null,

    localConfig: 'config.json',

    certificatesFolder: 'certificates',

    app: {
        name: 'Tinkr'
    },

    http: {
        api: false,
        enabled: true,
        port: process.env.TINKR_PORT || 2999
    },

    https: {
        api: true,
        enabled: true,
        port: process.env.TINKR_HTTPS_PORT || 2998,
        credentials: {
            
        }
    }
};
