var projects = require('../project-list');

var changeState = function (req, res, next) {
    var action = req.params.action;
    var project = projects.getByName(req.params.name);
    if (!project) {
        return res.sendStatus(404);
    }

    if (action == 'start') {
        if (req.body.version) {
            project.useVersion(req.body.version);
        }

        project.start();
    } else if (action == 'stop') {
        project.stop();
    } else if (action == 'restart') {
        project.restart();
    } else {
        return res.sendStatus(404);
    }

    res.sendStatus(200);
};

exports.extend = function (router) {
    router.post('/project/:name/state/:action', changeState);
};
