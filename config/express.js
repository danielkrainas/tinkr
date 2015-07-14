var express = require('express');
var morgan = require('morgan');
var multer = require('multer');
var bodyParser = require('body-parser');

var proxyRouter = require('../lib/proxy-router');
var projectManagementApi = require('../lib/api/project-management');
var relayManagementApi = require('../lib/api/relay-management');
var config = require('./');


module.exports = function (app, options) {
    options = options || {};

    app.set('showStackError', true);

    app.use(proxyRouter);

    app.use(morgan('dev'));

    if (options.api) {
        //app.use(morgan('dev'));

        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());

        app.use(multer({

        }));
        
        app.use(projectManagementApi);
        app.use(relayManagementApi);
    }

    app.use(function (err, req, res, next) {
        if (~err.message.indexOf('not found')) {
            return next();
        }

        console.error(err.stack);
        res.sendStatus(500);
    });

    app.use(function (req, res) {
        res.sendStatus(404);
    });
};
