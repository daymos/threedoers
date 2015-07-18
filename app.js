var express = require('express');
var config = require('./config/config');
var glob = require('glob');
var mongoose = require('mongoose');
var nconf = require('nconf');
var PrettyError = require('pretty-error');

// Refactored code

// mongoose.connect(config.db);
// var db = mongoose.connection;
// db.on('error', function () {
//   throw new Error('unable to connect to database at ' + config.db);
// });

// var models = glob.sync(config.root + '/app/models/*.js');
// models.forEach(function (model) {
//   require(model);
// });

var app = express();

// Old code
  var settings = require('./config');
  var HTTPStatus = require("http-status");
  var expressValidator = require('express-validator');
  var q = require('q');
  var io = require('socket.io');
  var logger = require("./lib/logger");

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

  validator = expressValidator();

  db = mongoose.connect(nconf.get('mongo:url'), nconf.get('mongo:options'), function(err) {
    if (err) {
      return logger.error(err);
    }
  });

  // FIXME: This is required for socket.io next change for primus and sockjs
  // Enables CORS
  var enableCORS = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, *');

        // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      return res.send(200);
    } else {
      next();
    };
  };
  app.use(enableCORS);

  // TODO: This is new code should keep
  ioSession = require('./config/express')(app, db, config);

  app.use(validator);

  app.use(function(req, res, next) {
    res.locals.user = req.user;
    res.locals.nav = req.path;
    res.locals.csrfToken = req.session._csrf;
    res.locals.io = settings.io;
    res.locals.site =nconf.get('site');
    return next();
  });

  app.locals.timeago = require('timeago');

  if (settings.protocol === 'https') {
    https = require('https');
    ssl_options = {
      key: fs.readFileSync(settings.ssl_key),
      cert: fs.readFileSync(settings.ssl_pem),
      ca: fs.readFileSync(settings.ssl_crt)
    };
    server = https.createServer(ssl_options, app).listen(nconf.get('host:port'), nconf.get('host:ip'), function() {
      logger.info("*   Visit page: " + nconf.get('host:protocol') + "://" + nconf.get('host:ip') + ":" + nconf.get('host:port'));
      logger.info('*   Mongo Database:', settings.db.name);
      logger.info('*   Pid File:', process.pid);
      logger.info('*');
      return logger.info('***********************************************************************');
    });
    io = io.listen(server);
  } else {
    http = require('http');
    server = http.createServer(app).listen(nconf.get('host:port'), nconf.get('host:ip'), function() {
      logger.info("*   Visit page: " + nconf.get('host:protocol') + "://" + nconf.get('host:ip') + ":" + nconf.get('host:port'));
      logger.info('*   Mongo Database:', settings.db.name);
      logger.info('*   Pid File:', process.pid);
      logger.info('*   Environment:', app.settings.env);
      logger.info('*');
      return logger.info('***********************************************************************');
    });
    io = io.listen(server);
  }

  if (app.get('env') !== 'development') {
    io.configure(function() {
      io.set('log level', 1);
      io.set('transports', ["websocket"]);
      io.enable("browser client minification");
      io.enable("browser client etag");
      io.enable("browser client gzip");
      return io.set('polling duration', 30);
    });
  }

  _ref = ['admin', 'filemanager', 'core', 'auth', 'registration', 'notification', 'design', 'api'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    appName = _ref[_i];
    logger.debug("Loading app " + appName);
    require("./lib/" + appName)(app, io);
  }

  app.use(function (req, res, next) {
    var err = new Error('not found');
    err.status = 404;
    next(err);
  });

  // we can now instantiaite Prettyerror:
  pe = new PrettyError();
  pe.skipNodeFiles();
  pe.skipPackage('express');

  if(app.get('env') === 'development'){
    app.use(function (err, req, res, next) {
      console.log(pe.render(err));
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err,
        title: 'error'
      });
    });
  } else {
    // This will handle all errors, render the appropiate view
    // and also will log to sentry
    app.use(function (err, req, res, next) {
      console.log(pe.render(err));
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: {},
        title: 'error'
      });
    });
  }

