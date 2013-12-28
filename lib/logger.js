(function() {
  var log, logger, loggers, settings, winston;

  winston = require('winston');

  settings = require('../config');

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

  loggers = [
    new winston.transports.Console({
      level: settings.logLevel,
      colorize: true
    })
  ];

  if (!settings.debug) {
    loggers.push(new winston.transports.File({
      filename: settings.logFile
    }));
  }

  logger = new winston.Logger({
    transports: loggers
  });

  logger.setLevels(log.logger.levels);

  winston.addColors(log.logger.colors);

  logger.debug("Creating logger+++++++++");

  module.exports = logger;

}).call(this);
