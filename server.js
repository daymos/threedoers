(function() {
  var HTTPStatus, MongoStore, app, appName, db, engines, env, express, gzippo, http, https, logger, mongoose, server, settings, ssl_options, _app, _i, _len, _ref;

  HTTPStatus = require("http-status");

  express = require("express");

  gzippo = require("gzippo");

  MongoStore = require("connect-mongodb");

  mongoose = require("mongoose");

  engines = require('consolidate');

  logger = require("./lib/logger");

  settings = require('./config');

  env = process.env.NODE_ENV || 'development';

  global.env = env;

  global.root = __dirname;

  logger.info('');

  logger.info('***********************************************************************');

  logger.info('* Starting iMake server:');

  logger.info('*');

  app = express();

  app.on('mount', function(parent) {
    return console.log(parent);
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

  app.use(gzippo.compress());

  app.disable("x-powered-by");

  db = mongoose.connect("" + settings.db.host + settings.db.name);

  _ref = ['core', 'auth'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    appName = _ref[_i];
    _app = require("./lib/" + appName);
    _app.once('mount', function(parent) {
      _app.engines = parent.engines;
      return _app.set('views', parent.get('views'));
    });
    app.use(_app);
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
