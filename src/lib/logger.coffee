##############################################################################
# Logger module for all apps
##############################################################################

winston = require 'winston'
settings = require '../config'
raven = require 'raven'
util = require 'util'

log = logger:
  levels:
    detail: 0
    trace: 1
    debug: 2
    enter: 3
    info: 4
    warn: 5
    error: 6

  colors:
    detail: "grey"
    trace: "white"
    debug: "blue"
    enter: "inverse"
    info: "green"
    warn: "yellow"
    error: "red"

if settings.debug
    loggers = [new (winston.transports.Console)(level: settings.logLevel, colorize: true)]
else
    ###
    # Custom logger
    ###
    SentryLogger = winston.transports.CustomerLogger = (options) ->

      #
      # Name this logger
      #
      @name = "Sentry logs"

      #
      # Set the level from your options
      #
      @level = options.level or "info"

      @client = new raven.Client(settings.sentry.DSN)
      return


    #
    # Configure your storage backing as you see fit
    #

    #
    # Inherit from `winston.Transport` so you can take advantage
    # of the base functionality and `.handleExceptions()`.
    #
    util.inherits SentryLogger, winston.Transport
    SentryLogger::log = (level, msg, meta, callback) ->

      #
      # Store this message and metadata, maybe use some custom logic
      # then callback indicating success.
      #
      if level == "error"
        @client.captureError(msg)
      else
        @client.captureMessage(msg, {level: level, extra: msg})
      callback null, true
      return

    ###
    # END Custom logger
    ###

    loggers = [new (SentryLogger)(level: settings.logLevel, colorize: true)]

# unless settings.debug
#   loggers.push(new (winston.transports.File)(filename: settings.logFile))

logger = new (winston.Logger)(transports: loggers)

logger.setLevels log.logger.levels
winston.addColors log.logger.colors

module.exports = logger
