var projects = require('../project-list');

var changeState = function (req, res, next) {
    var action = req.params.action;
    var project = projects.getByName(req.params.name);
    if (!project) {
        return res.sendStatus(404);
    }

    if (action == 'start') {
        if (req.body.version) {
            project.useVersion(req.body.version, function (err) {
                if (err) {
                    return next(err);
                }

                project.start(function (err) {
                    if (err) {
                        return next(err);
                    }

                    res.sendStatus(200);
                });
            });
        } else {
            project.start(function (err) {
                if (err) {
                    return next(err);
                }

                res.sendStatus(200);
            });
        }
    } else if (action == 'stop') {
        project.stop(function (err) {
            if (err) {
                return next(err);
            }

            res.sendStatus(200);
        });
    } else if (action == 'restart') {
        project.restart(function (err) {
            if (err) {
                return next(err);
            }
            
            res.sendStatus(200);
        });
    } else {
        return res.sendStatus(404);
    }
};

exports.extend = function (router) {
    router.post('/project/:name/state/:action', changeState);
};
