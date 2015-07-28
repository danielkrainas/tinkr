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
            return res.status(400).send(err);
        }

        res.sendStatus(200);
    });
};

var addSnapshot = function (req, res, next) {
    fs.readFile(req.files.project.path, function (err, data) {
        if (err) {
            return next(err);
        }

        var settings = snapshots.getSettingsFromProject(JSON.parse(data));
        var project = projects.getByName(settings.project);
        if (!settings || !project) {
            res.sendStatus(400);
        } else {
            if (req.files.snapshot) {
                snapshots.add(settings, project, function (err, snapshot) {
                    if (err) {
                        return next(err);
                    }

                    snapshot.store(req.files.snapshot, function (err) {
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

var activateVersion = function (req, res, next) {
    var project = projects.getByName(req.params.name);
    if (!project) {
        return res.sendStatus(404);
    }

    var running = project.running;
    project.useVersion(req.params.version, function (err) {
        if (err) {
            return next(err);
        }

        res.sendStatus(200);
    });
};

exports.extend = function (router) {
    router.get('/project/:name/snapshots', getSnaphots);
    router.post('/project/:name/snapshots', addSnapshot);
    router.delete('/project/:name/snapshots/:version', removeSnapshot);
    router.post('/project/:name/snapshots/:version/activate', activateVersion);
};
