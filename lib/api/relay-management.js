var router = require('express').Router();

var relays = require('../relays');
var RelayWrapper = require('../relay-wrapper');


var getAll = function (req, res) {
    res.json(relays.list());
};

var addRelay = function (req, res, next) {
    var meta = RelayWrapper.createMeta(req.body);
    relays.add(meta, function (err) {
        if (err) {
            return next(err);
        }

        res.sendStatus(200);
    });
};

var removeRelay = function (req, res, next) {
    relays.remove(req.params.name, function (err) {
        if (err) {
            return next(err);
        }

        res.sendStatus(200);
    });
};

router.get('/relays', getAll);
router.post('/relays', addRelay);
router.delete('/relay/:name', removeRelay);

module.exports = exports = router;
