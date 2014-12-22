var httpProxy = require('http-proxy');

var projects = require('./project-list');
var stubs = require('./stubs');


var proxy = httpProxy.createProxyServer({
    ws: true
});

module.exports = exports = function (req, res, next) {
    var project = projects.getByDomain(req.hostname);
    var stub = stubs.getByDomain(req.hostname);
    var target = null;
    if (project && project.running) {
        target = project.proxy;
    } else if (stub) {
        target = stub.proxy;
    }

    //console.log({ hostname: req.hostname, project: project, stub: stub, target: target });

    if (target) {
        console.log(req.hostname + ' => ' + target + '/' + req.path);
        proxy.web(req, res, { target: target });
    } else {
        next();
    }
};
