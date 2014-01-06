(function() {
  var HTTPStatus, SessionStore, app, appName, db, engines, env, express, expressValidator, gzippo, http, https, logger, mongoose, passport, q, server, settings, ssl_options, validator, _i, _len, _ref;

  HTTPStatus = require("http-status");

  express = require("express");

  gzippo = require("gzippo");

  SessionStore = require('session-mongoose')(express);

  mongoose = require("mongoose");

  engines = require('consolidate');

  expressValidator = require('express-validator');

  q = require('q');

  passport = require("passport");

  logger = require("./lib/logger");

  settings = require('./config');

  mongoose.Promise.prototype.then = function(fulfilled, rejected) {
    var deferred;
    deferred = q.defer();
    this.addCallback(deferred.resolve);
    this.addErrback(deferred.reject);
    return deferred.promise.then(fulfilled, rejected);
  };

  env = process.env.NODE_ENV || 'development';

  global.env = env;

  global.root = __dirname;

  logger.info('');

  logger.info('***********************************************************************');

  logger.info('* Starting 3doers server:');

  logger.info('*');

  app = express();

  validator = expressValidator();

  db = mongoose.connect("" + settings.db.host + settings.db.name, {
    db: {
      safe: true,
      autoIndex: false
    }
  }, function(err) {
    if (err) {
      return logger.error(err);
    }
  });

  app.set('port', settings.host.port);

  app.engine('jade', engines.jade);

  app.set('view engine', 'jade');

  app.set('views', "" + global.root + "/views");

  app.use(express["static"]("" + global.root + "/public"));

  app.use(express.bodyParser({
    keepExtensions: true,
    uploadDir: settings.mediaRoot
  }));

  app.use(express.cookieParser());

  app.use(express.methodOverride());

  app.use(validator);

  app.use(express.session({
    secret: settings.cookieSecret,
    store: new SessionStore({
      url: "" + settings.db.host + settings.db.name
    })
  }));

  app.use(passport.initialize());

  app.use(passport.session());

  app.use(express.csrf());

  app.use(gzippo.compress());

  app.disable("x-powered-by");

  app.configure('development', function() {
    app.locals.pretty = true;
    return app.use(express.errorHandler());
  });

  app.use(function(req, res, next) {
    res.locals({
      user: req.user,
      nav: req.path,
      csrfToken: req.session._csrf
    });
    return next();
  });

  _ref = ['core', 'auth', 'registration'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    appName = _ref[_i];
    require("./lib/" + appName)(app);
  }

  if (settings.protocol === 'https') {
    https = require('https');
    ssl_options = {
      key: fs.readFileSync(settings.ssl_key),
      cert: fs.readFileSync(settings.ssl_pem),
      ca: fs.readFileSync(settings.ssl_crt)
    };
    server = https.createServer(ssl_options, app).listen(settings.host.port, settings.host.ip, function() {
      logger.info("*   Visit page: " + settings.host.protocol + "://" + settings.host.ip + ":" + settings.host.port);
      logger.info('*   Mongo Database:', settings.db.name);
      logger.info('*   Pid File:', process.pid);
      logger.info('*');
      return logger.info('***********************************************************************');
    });
  } else {
    http = require('http');
    server = http.createServer(app).listen(settings.host.port, settings.host.ip, function() {
      logger.info("*   Visit page: " + settings.host.protocol + "://" + settings.host.ip + ":" + settings.host.port);
      logger.info('*   Mongo Database:', settings.db.name);
      logger.info('*   Pid File:', process.pid);
      logger.info('*');
      return logger.info('***********************************************************************');
    });
  }

}).call(this);
