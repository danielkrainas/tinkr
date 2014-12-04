var router = require('express').Router();

var stubs = require('../stubs');
var StubWrapper = require('../stub-wrapper');


var getAll = function (req, res) {
    res.json(stubs.list());
};

var addStub = function (req, res) {
    var meta = StubWrapper.createMeta(StubWrapper.createMeta(req.body));
    stubs.add(meta, true);
    res.sendStatus(200);
};

var removeStub = function (req, res, next) {
    stubs.remove(req.params.name, true);
    res.sendStatus(200);
};

router.get('/stubs', getAll);
router.post('/stubs', addStub);
router.delete('/stub/:name', removeStub);

module.exports = exports = router;
