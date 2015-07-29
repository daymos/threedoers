/**
 *  Copyright (c) 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 */

// Setting up react requirements
require('node-jsx').install({extension: 'jsx', harmony: true});

// Setup babel to use es6 till is supported at full
require('babel/register');


var express = require('express');
var glob = require('glob');
var mongoose = require('mongoose');
var nconf = require('nconf');
var PrettyError = require('pretty-error');
var raven = require('raven');

var config = require('./config/config');
// Controllers modules
var Printing = require('controllers/printing');

// React stuff
var React = require('react');
var Forbidden = React.createFactory(require('components/forbidden'));

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

if (app.get('env') === 'development') {
  raven.middleware.express.requestHandler(nconf.get('sentry:DSN'));
}


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
  logger.info('***************************************************');
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
    res.locals.site = nconf.get('site');
    res.locals.DEBUG = app.get('env') === 'development';
    res.locals.PRODUCTION = app.get('env') === 'production';
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
      return logger.info('***************************************************');
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
      return logger.info('***************************************************');
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

  // FIXME: This is Real code now put in right place latter
  var printingRouter = express.Router();

  printingRouter.param('projectID', Printing.paramProject);
  printingRouter.get('/:projectID', Printing.projectDetail);

  app.use('/project', printingRouter);
  // ENDFIXME


  _ref = ['admin', 'filemanager', 'core', 'auth', 'registration', 'notification', 'design', 'api'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    appName = _ref[_i];
    require("./lib/" + appName)(app, io);
  }

  // TODO: This is latest code should work!
  app.use(function (req, res, next) {
    var err = new Error('not found');
    err.status = HTTPStatus.NOT_FOUND;
    next(err);
  });

  // we can now instantiaite Prettyerror:
  pe = new PrettyError();
  pe.skipNodeFiles();
  pe.skipPackage('express');

  // Forbidden middleware handler
  app.use(function (err, req, res, next) {
    if (err.status == HTTPStatus.FORBIDDEN) {
      res.status(err.status);
      if (req.xhr) {
        return res.send({message: err.message});
      } else {
        var reactHTML = React.renderToString(Forbidden({message: err.message, loggedIn: !!req.user}));
        return res.render('forbidden.html', {reactHTML: reactHTML});
      }
    } else {
      return next(err);
    }
  });

  // Not found middleware handler
  app.use(function (err, req, res, next) {
    if (err.status == HTTPStatus.NOT_FOUND) {
      console.log('*****************');
      console.log(req.xhr);
      res.status(err.status);
      return req.xhr ? res.end() : res.render('not-found.html');
    } else {
      return next(err);
    }
  });

  if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
      console.log(pe.render(err));
      res.status(err.status || 500);
      if (req.xhr) {
        return res.end();
      } else {
        return res.render('error.html', {
          message: err.message,
          error: err,
          title: 'error'
        });
      }
    });
  } else {
    // This will handle all errors, render the appropiate view
    // and also will log to sentry
    app.use(raven.middleware.express.errorHandler(nconf.get('sentry:DSN')))
    app.use(function (err, req, res, next) {
      console.log(pe.render(err));
      res.status(err.status || 500);
      if (req.xhr) {
        return res.end();
      } else {
        return res.render('error.html', {
          message: err.message,
          error: {},
          title: 'error'
        });
      }
    });
  }

