/*
 * This module will only config the express server
 * all related with express.
 */
var express = require('express');
var glob = require('glob');
var gzippo = require("gzippo");
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieparser = require('cookie-parser');
var bodyparser = require('body-parser');
var compress = require('compression');
var methodoverride = require('method-override');
var swig = require('swig');
var nconf = require('nconf');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var passport = require("passport");
var raven = require('raven');
var flash = require('connect-flash');


module.exports = function(app, db, config) {
  // Setup template engines
  app.engine('html', swig.renderFile);
  app.set('views', nconf.get('rootDir') + '/app/views');
  app.set('view engine', 'html');

  // TODO: Remove this later! when refactor will be finished
  app.engine('jade', require('consolidate').jade);
  app.set('view engine', 'jade');

  var sessionStore = new MongoStore({
    mongooseConnection: db.connection,
    ttl: 24 * 60 * 60
  });

  // Setup Sessions
  app.use(session({
    secret: nconf.get('SECRET_KEY'),
    key: "3doers",
    resave: true,
    saveUninitialized: true,
    store: sessionStore,
  }));

  var env = process.env.node_env || 'development';
  app.locals.env = env;
  app.locals.is_development = env == 'development';

  // app.use(favicon(config.root + '/public/img/favicon.ico'));
  app.use(logger('dev'));
  app.use(bodyparser.json());
  app.use(bodyparser.urlencoded({
    extended: true
  }));

  // FIXME: Remove this, will be only used for request that need it
  var multer  = require('multer');
  app.use(multer({dest: nconf.get('media:upload:to')}));

  app.use(cookieparser());
  app.use(compress());
  app.use(express.static(nconf.get('media:upload:to')));
  app.use(express.static(nconf.get('static:path')));
  app.use(methodoverride());

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(gzippo.compress());
  app.disable("x-powered-by");
  app.use(flash());

  // settings
  if (app.get('env') == 'development') {
    app.locals.pretty = true;
  }

  // FIXME: Remove this later
  app.set('port', nconf.get('host:port'));

};
