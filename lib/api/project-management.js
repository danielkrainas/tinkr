var router = require('express').Router();
var async = require('async');

var projects = require('../project-list');
var Project = require('../project');
var snapshots = require('../snapshots');
var pm = require('../process-manager');


var getAll = function (req, res) {
    res.json(projects.listDescriptors());
};

var updateProject = function (req, res) {
    var project = projects.getByName(req.params.name);
    if (!project) {
        return res.status(404).send('no_such_project');
    }

    var meta = Project.createDescriptor(req.body);
    project.update(meta);
    res.status(200).end();
};

var addProject = function (req, res) {
    var meta = Project.createDescriptor(req.body);
    projects.add(meta, function (err) {
        if (err) {
            res.status(400).send(err.toString());
        } else {
            res.sendStatus(200);
        }
    });
};

var removeProject = function (req, res, next) {
    var project = projects.getByName(req.params.name);
    if (!project) {
        return res.status(404).send('no_such_project');
    }

    async.series([
        function (callback) {
            var instances = pm.getAllInstances(project);
            if (instances.length > 0) {
                pm.unloadAll(instances).nodeify(callback);
            } else {
                callback();
            }
        },

        function (callback) {
            snapshots.removeAllFor(project.name, callback);
        },

        function (callback) {
            projects.remove(project.name, callback);
        }
    ], function (err) {
        if (err) {
            res.status(400).send(err.toString());
        } else {
            res.sendStatus(200);
        }
    });
};

router.get('/projects', getAll);
router.post('/projects', addProject);
router.delete('/project/:name', removeProject);
router.put('/project/:name', updateProject);

/* extended API's */
require('./ext-snapshot-management').extend(router);
require('./ext-state-management').extend(router);
require('./ext-env-management').extend(router);

module.exports = exports = router;
