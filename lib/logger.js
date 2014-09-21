(function() {
  var SentryLogger, log, logger, loggers, raven, settings, util, winston;

  winston = require('winston');

  settings = require('../config');

  raven = require('raven');

  util = require('util');

  log = {
    logger: {
      levels: {
        detail: 0,
        trace: 1,
        debug: 2,
        enter: 3,
        info: 4,
        warn: 5,
        error: 6
      },
      colors: {
        detail: "grey",
        trace: "white",
        debug: "blue",
        enter: "inverse",
        info: "green",
        warn: "yellow",
        error: "red"
      }
    }
  };

  if (settings.debug) {
    loggers = [
      new winston.transports.Console({
        level: settings.logLevel,
        colorize: true
      })
    ];
  } else {
    /*
    # Custom logger
    */

    SentryLogger = winston.transports.CustomerLogger = function(options) {
      this.name = "Sentry logs";
      this.level = options.level || "info";
      this.client = new raven.Client(settings.sentry.DSN);
    };
    util.inherits(SentryLogger, winston.Transport);
    SentryLogger.prototype.log = function(level, msg, meta, callback) {
      if (level === "error") {
        this.client.captureError(msg);
      } else {
        this.client.captureMessage(msg, {
          level: level,
          extra: msg
        });
      }
      callback(null, true);
    };
    /*
    # END Custom logger
    */

    loggers = [
      new winston.transports.Console({
        level: settings.logLevel,
        colorize: true
      }), new SentryLogger({
        level: settings.logLevel
      })
    ];
  }

  logger = new winston.Logger({
    transports: loggers
  });

  logger.setLevels(log.logger.levels);

  winston.addColors(log.logger.colors);

  module.exports = logger;

}).call(this);
