(function() {
  var log, logger, loggers, raven, settings, util, winston;

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

  loggers = [
    new winston.transports.Console({
      level: settings.logLevel,
      colorize: true
    })
  ];

  logger = new winston.Logger({
    transports: loggers
  });

  logger.setLevels(log.logger.levels);

  winston.addColors(log.logger.colors);

  module.exports = logger;

}).call(this);
