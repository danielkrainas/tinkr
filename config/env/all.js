var path = require('path');
var rootPath = path.normalize(__dirname + '/../..');
var homePath = process.env.TINKR_HOME || path.resolve(path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.\\.tinkr'));

module.exports = {
    pkg: require(path.join(rootPath, 'package.json')),

	root: rootPath,

    home: homePath,

    stubDataFile: path.join(homePath, 'stubs.db'),

    snapshotDataFile: path.join(homePath, 'snapshots.db'),

    projectDataFile: path.join(homePath, 'projects.db'),

    projectFolder: path.join(homePath, 'projects'),

    snapshotFolder: path.join(homePath, 'snapshots'),

    app: {
        name: 'Tinkr'
    },

	port: process.env.PORT || 2999
};
