var path = require('path');
var rootPath = path.normalize(__dirname + '/../..');
var homePath = process.env.TINKRD_HOME || path.resolve(path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.\\.tinkrd'));

module.exports = {
    pkg: require(path.join(rootPath, 'package.json')),

	root: rootPath,

    home: homePath,

    relayDataFile: 'relays.db',

    snapshotDataFile: 'snapshots.db',

    projectDataFile: 'projects.db',

    projectFolder: 'projects',

    snapshotFolder: 'snapshots',

    extraConfig: process.env.TINKRD_CONFIG || null,

    localConfig: 'config.json',

    certificatesFolder: 'certificates',

    app: {
        name: 'Tinkrd'
    },

    http: {
        api: false,
        enabled: true,
        port: process.env.TINKRD_PORT || 2999
    },

    https: {
        api: true,
        enabled: true,
        port: process.env.TINKRD_HTTPS_PORT || 2998,
        credentials: {
            
        }
    }
};
