var nconf = require('nconf');

  var log, logger, loggers, settings, util, winston;
  winston = require('winston');
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
      level: nconf.get('logLevel'),
      colorize: true
    })
  ];

  logger = new winston.Logger({
    transports: loggers
  });

  logger.setLevels(log.logger.levels);

  winston.addColors(log.logger.colors);

  module.exports = logger;
