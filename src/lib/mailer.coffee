consolidate = require 'consolidate'
q = require 'q'
nodemailer = require 'nodemailer'

settings = require '../config'
logger = require './logger'


class Mailer

  constructor: ->
    @transport = nodemailer.createTransport "SMTP",
      service: settings.mailer.service
      auth:
        user: settings.mailer.username
        pass: settings.mailer.password

  send: (template, context, options) ->
    deferred = q.defer()

    context.cache = true  # enabling cache for consolidate

    consolidate.jade "#{settings.rootDir}/views/#{template}.jade", context, (err, html) =>
      if err
        logger.error err
        deferred.reject err
      else
        throw new Error "No options sent to mailer" unless options?
        options.html = html
        @transport.sendMail options, (err, response) ->
          logger.debug arguments
          if err
            deferred.reject err
          else
            logger.info "Message sent: #{response.message} "
            deferred.resolve response

    return deferred.promise


module.exports.mailer = new Mailer
