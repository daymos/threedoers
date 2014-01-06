(function() {
  module.exports = function(app) {
    var auth, logger, mailer, registration, settings;
    auth = require('../auth/models');
    registration = require('./models');
    logger = require('../logger');
    mailer = require('../mailer').mailer;
    settings = require('../../config');
    app.get('/accounts/signup', function(req, res) {
      return res.render('registration/signup');
    });
    app.post('/accounts/signup', function(req, res, next) {
      var errors, password;
      password = req.body.password;
      req.assert('username', {
        regex: "Invalid username."
      }).regex(/^[a-z0-9_-]{3,16}$/);
      req.assert('email').isEmail();
      req.assert('password', {
        regex: "Should contains from 4 to 15, letters(uppercase, downcase), digits, first should be a letter."
      }).regex(/^[a-zA-Z]\w{3,14}$/);
      req.assert('passwordConfirm', {
        regex: "Should contains from 4 to 15, letters(uppercase, downcase), digits, first should be a letter.",
        equals: "Passwords didn't match"
      }).regex(/^[a-zA-Z]\w{3,14}$/).equals(password);
      errors = req.validationErrors(true);
      if (errors) {
        return res.render('registration/signup', {
          errors: errors,
          username: req.body.username,
          email: req.body.email
        });
      } else {
        return auth.User.find({
          $or: [
            {
              username: req.body.username
            }, {
              email: req.body.email
            }
          ]
        }).exec().then(function(users) {
          var ac, user, _i, _len;
          if (users.length > 0) {
            errors = {};
            for (_i = 0, _len = users.length; _i < _len; _i++) {
              user = users[_i];
              if (user.username === req.body.username) {
                errors.username = {
                  msg: "Username already taken."
                };
              } else if (user.email === req.body.email) {
                errors.email = {
                  msg: "Email already taken."
                };
              }
            }
            return res.render('registration/signup', {
              errors: errors,
              username: req.body.username,
              email: req.body.email
            });
          } else {
            ac = new registration.Activation({
              email: req.body.email
            });
            return ac.save(function(err, activation, count) {
              var context;
              if (!err) {
                context = {
                  url: "" + settings.site + "/accounts/activation/" + activation.hashedEmail,
                  username: req.body.username
                };
                return mailer.send('mailer/accounts/registration', context, {
                  from: settings.mailer.noReply,
                  to: [activation.email],
                  subject: settings.registration.activation.subject
                }).then(function() {
                  var usr;
                  usr = new auth.User({
                    username: req.body.username,
                    email: req.body.email,
                    city: req.body.city,
                    country: req.body.country,
                    address: req.body.address
                  });
                  usr.password = req.body.password;
                  return usr.save(function(err, user, count) {
                    return res.redirect('/accounts/signup/done');
                  });
                });
              } else {
                return next(err);
              }
            });
          }
        }).fail(function(reason) {
          logger.error(reason);
          return res.send(500);
        });
      }
    });
    app.get('/accounts/signup/done', function(req, res) {
      return res.render('registration/activation');
    });
    return app.get('/accounts/activation/:hash', function(req, res) {
      return registration.Activation.findOne({
        hashedEmail: req.params.hash,
        activated: false
      }).exec().then(function(activation) {
        if (activation) {
          activation.activated = true;
          activation.save();
          return auth.User.findOne({
            email: activation.email
          }).exec().then(function(user) {
            user.active = true;
            return user.save(function(err) {
              logger.error(err);
              if (err) {
                return res.render('registration/activation_done', {
                  activated: null
                });
              } else {
                return res.render('registration/activation_done', {
                  activated: user
                });
              }
            });
          });
        } else {
          return res.render('registration/activation_done', {
            activated: null
          });
        }
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      });
    });
  };

}).call(this);
