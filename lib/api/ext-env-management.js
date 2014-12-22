var snapshots = require('../snapshots');

var setEnv = function (req, res, next) {
    var snapshot = snapshots.getByApp(req.params.name, req.params.version);
    if (!snapshot) {
        return res.sendStatus(404);
    }

    snapshot.setEnv(req.body.key, req.body.value);
    res.sendStatus(200);
};

var delEnv = function (req, res, next) {
    var snapshot = snapshots.getByApp(req.params.name, req.params.version);
    if (!snapshot) {
        return res.sendStatus(404);
    }

    snapshot.setEnv(req.params.key, null);
    res.sendStatus(200);
};

exports.extend = function (router) {
    router.post('/project/:name/snapshots/:version/env', setEnv);
    router.delete('/project/:name/snapshots/:version/env/:key', delEnv);
};
