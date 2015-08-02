var projects = require('../project-list');
var pm = require('../process-manager');

var changeState = function (req, res, next) {
    var action = req.params.action;
    var project = projects.getByName(req.params.name);
    if (!project) {
        return res.sendStatus(404);
    }

    var respondOk = function () {
        res.status(200);
    };

    var instance = pm.getInstance(project, req.body.version);
    if (action === 'start') {
        pm.load(project, req.body.version)
        .then(function (i) {
            i.start()
            .then(respondOk)
            .catch(function (err) {
                console.log(err.toString());
                res.status(400).send(err.toString());
            });
        });
    } else if (action === 'stop') {
        if (instance) {
            instance.stop().then(respondOk);
        } else {
            respondOk();
        }
    } else if (action === 'restart') {
        if (instance) {
            instance.restart().then(respondOk);
        } else {
            respondOk();
        }
    } else {
        return res.sendStatus(404);
    }
};

exports.extend = function (router) {
    router.post('/project/:name/state/:action', changeState);
};
