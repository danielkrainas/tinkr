var path = require('path');
var rootPath = path.normalize(__dirname + '/../..');
var homePath = process.env.TINKR_HOME || path.resolve(path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.\\.tinkr'));

module.exports = {
    pkg: require(path.join(rootPath, 'package.json')),

	root: rootPath,

    home: homePath,

    dataFolder: process.env.TINKR_DATA_FOLDER || path.join(rootPath, 'data'),

    projectFolder: process.env.TINKR_PROJECT_FOLDER || path.join(rootPath, 'projects'),

    snapshotFolder: process.env.TINKR_SNAPSHOT_FOLDER || path.join(rootPath, 'snapshots'),

    app: {
        name: 'Tinkr'
    },

	port: process.env.PORT || 2999
};
