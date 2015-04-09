var path = require('path');
var rootPath = path.normalize(__dirname + '/../..');
var homePath = process.env.TINKR_HOME || path.resolve(path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.\\.tinkr'));

module.exports = {
    pkg: require(path.join(rootPath, 'package.json')),

	root: rootPath,

    home: homePath,

    stubDataFile: 'stubs.db',

    snapshotDataFile: 'snapshots.db',

    projectDataFile: 'projects.db',

    projectFolder: 'projects',

    snapshotFolder: 'snapshots',

    app: {
        name: 'Tinkr'
    },

	port: process.env.TINKR_PORT || 80
};
