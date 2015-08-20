/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import nconf from 'nconf';
import winston from 'winston';
import moment from 'moment';
import colors from 'colors/safe';
import winstonConfig from 'winston/lib/winston/config';


let logLevels = {
  detail: 0,
  trace: 1,
  debug: 2,
  enter: 3,
  info: 4,
  warn: 5,
  error: 6
};

let transports = [
  winston.transports.Console
];

// Memoize all loggers
let loggers = {};

/**
 * Creates the transports based on options
 */
function getTransports(name) {
    // Custom format add name of logger!
    let options = {
      colorize: true,
      level: nconf.get('logLevel'),
      timestamp: function () { return moment(); },
      formatter: function (_options) {
        let date = colors.gray(_options.timestamp().format('MM/DD/YY hh:mm:ss ZZ'));
        let level = winston.config.colorize(_options.level, _options.level);
        let _name = colors.magenta(name);
        return `[${date}] ${level}#${_name} ${_options.message}`;
      }
    };

    return transports.map( Transport => new Transport(options));
}

/**
 * Will return the correct logger that will define
 * above the correct transports.
 */
export default function getLogger(name) {
  if (!loggers[name]) {
    let _transports = getTransports(name);
    loggers[name] = new winston.Logger({transports: _transports});
    loggers[name].setLevels(logLevels);
  }

  return loggers[name];
}

/*
  winston.addColors(log.logger.colors);
  */
