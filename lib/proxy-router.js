var httpProxy = require('http-proxy');

var projects = require('./project-list');
var relays = require('./relays');
var pm = require('./process-manager');


var proxy = httpProxy.createProxyServer({
    ws: true
});

module.exports = exports = function (req, res, next) {
    var project = projects.getByDomain(req.hostname);
    var relay = relays.getByDomain(req.hostname);
    var target = null;
    if (project && project.state) {
        target = project.proxy;
        console.log({project: project});
    } else if (relay) {
        target = relay.destination;
    }

    if (target) {
        console.log(req.hostname + ' => ' + target + req.path);
        proxy.web(req, res, { target: target });
    } else {
        next();
    }
};
