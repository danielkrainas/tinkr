var _ = require('lodash');

var snapshots = require('../snapshots');
var projects = require('../project-list');
var fs = require('fs');
var toml = require('toml');


var getSnaphots = function (req, res) {
    var result = snapshots.getAllFor(req.params.name);
    res.json(_.pluck(result, 'config').valueOf());
};

var removeSnapshot = function (req, res) {
    snapshots.remove(req.params.name, req.params.version, function (err) {
        if (err) {
            return next(err);
        }

        res.sendStatus(200);
    });
};

var addSnapshot = function (req, res, next) {
    fs.readFile(req.files.project.path, function (err, data) {
        if (err) {
            return next(err);
        }

        var snapshot = snapshots.getSettingsFromProject(JSON.parse(data));
        if (!snapshot) {
            res.sendStatus(400);
        } else {
            if (req.files.snapshot) {
                snapshot.store(req.files.snapshot, function (err) {
                    if (err) {
                        return next(err);
                    }

                    snapshots.add(snapshot, function (err) {
                        if (err) {
                            return next(err);
                        }

                        res.sendStatus(200);
                    });
                });
            } else {
                res.sendStatus(400);
            }
        }
    });
};

var activateVersion = function (req, res) {
    var project = projects.getByName(req.params.name);
    if (!project) {
        return res.sendStatus(404);
    }

    var running = project.running;
    if(!project.useVersion(req.params.version)) {
        return res.sendStatus(400);
    }

    res.sendStatus(200);
};

exports.extend = function (router) {
    router.get('/project/:name/snapshots', getSnaphots);
    router.post('/project/:name/snapshots', addSnapshot);
    router.delete('/project/:name/snapshots/:version', removeSnapshot);
    router.post('/project/:name/snapshots/:version/activate', activateVersion);
};
