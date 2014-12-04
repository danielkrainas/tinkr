var _ = require('lodash');

var snapshots = require('../snapshots');
var projects = require('../project-list');


var getSnaphots = function (req, res) {
    var result = snapshots.getAllFor(req.params.name);
    res.json(_.pluck(result, 'config').valueOf());
};

var removeSnapshot = function (req, res) {
    if (!snapshots.remove(req.params.name, req.params.version, true)) {
        return res.sendStatus(400);
    }

    res.sendStatus(200);
};

var addSnapshot = function (req, res, next) {
    var snapshot = snapshots.create(req.body);
    console.log(req.body);
    console.log(req.files);
    return res.sendStatus(200);
    if (!snapshot) {
        res.sendStatus(400);
    } else {
        snapshots.add(snapshot, true);
        if (req.files.length) {
            snapshot.store(req.files[0], function (err) {
                if (err) {
                    return next(err);
                }

                res.sendStatus(200);
            });            
        } else {
            res.sendStatus(200);
        }
    }
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
    router.delete('/project/:name/snaphots/:version', removeSnapshot);
    router.post('/project/:name/snapshots/:version/activate', activateVersion);
};
