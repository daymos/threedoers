(function() {
  var Mailer, consolidate, logger, nodemailer, q, settings;

  consolidate = require('consolidate');

  q = require('q');

  nodemailer = require('nodemailer');

  settings = require('../config');

  logger = require('./logger');

  Mailer = (function() {
    function Mailer() {
      this.transport = nodemailer.createTransport("SMTP", {
        service: settings.mailer.service,
        auth: {
          user: settings.mailer.username,
          pass: settings.mailer.password
        }
      });
    }

    Mailer.prototype.send = function(template, context, options) {
      var deferred,
        _this = this;
      deferred = q.defer();
      context.cache = true;
      consolidate.jade("" + settings.rootDir + "/views/" + template + ".jade", context, function(err, html) {
        if (err) {
          logger.error(err);
          return deferred.reject(err);
        } else {
          if (options == null) {
            throw new Error("No options sent to mailer");
          }
          options.html = html;
          return _this.transport.sendMail(options, function(err, response) {
            if (err) {
              return deferred.reject(err);
            } else {
              logger.info("Message sent: " + response.message + " ");
              return deferred.resolve(response);
            }
          });
        }
      });
      return deferred.promise;
    };

    return Mailer;

  })();

  module.exports.mailer = new Mailer;

}).call(this);
