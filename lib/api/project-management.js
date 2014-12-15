var router = require('express').Router();

var projects = require('../project-list');
var Project = require('../project');


var getAll = function (req, res) {
    res.json(projects.listDescriptors());
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
    projects.remove(req.params.name, function (err) {
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

/* extended API's */
require('./ext-snapshot-management').extend(router);
require('./ext-state-management').extend(router);
require('./ext-env-management').extend(router);

module.exports = exports = router;
