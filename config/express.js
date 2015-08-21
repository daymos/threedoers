/**
 *  @copyright 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 *
 *  @fileoverview This module will only config the express server
 *  all related with express.
 */
import express from 'express';
import glob from 'glob';
import gzippo from 'gzippo';
import favicon from 'serve-favicon';
import logger from 'morgan';
import bodyparser from 'body-parser';
import compress from 'compression';
import cookieParser from 'cookie-parser';
import methodoverride from 'method-override';
import swig from 'swig';
import nconf from 'nconf';
import session from 'express-session';
import passport from 'passport';
import rven from 'raven';
import flash from 'connect-flash';


let MongoStore = require('connect-mongo')(session);

module.exports = function(app, db, config) {
  var cookies = cookieParser(nconf.get('SECRET_KEY'));
  var sessionStore = new MongoStore({
    mongooseConnection: db.connection,
    ttl: 24 * 60 * 60
  });

  var _session = session({
    secret: nconf.get('SECRET_KEY'),
    resave: true,
    saveUninitialized: true,
    store: sessionStore
  });

  // Setup template engines
  app.engine('html', swig.renderFile);
  app.set('views', nconf.get('rootDir') + '/app/views');
  app.set('view engine', 'html');

  // TODO: Remove this later! when refactor will be finished
  app.engine('jade', require('consolidate').jade);
  app.set('view engine', 'jade');

  var env = process.env.node_env || 'development';
  app.locals.env = env;
  app.locals.is_development = env === 'development';

  // app.use(favicon(config.root + '/public/img/favicon.ico'));
  if (app.get('env') === 'development') {
    app.use(logger('dev'));
  } else {
    app.use(logger('combined'));
  }

  app.use(bodyparser.json());
  app.use(bodyparser.urlencoded({
    extended: true
  }));


  app.use(compress());
  app.use(express.static(nconf.get('media:upload:to')));
  app.use(express.static(nconf.get('static:path')));
  app.use(methodoverride());

  app.use(cookies);

  // Setup Sessions
  app.use(_session);

  app.use(passport.initialize());
  app.use(passport.session());
  //app.use(gzippo.compress());
  app.disable("x-powered-by");
  app.use(flash());

  // settings
  if (app.get('env') === 'development') {
    app.locals.pretty = true;
  }

  // FIXME: Remove this later
  app.set('port', nconf.get('host:port'));

  return {sessionStore, cookies, session: _session};
};
