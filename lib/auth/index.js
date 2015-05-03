(function() {
  module.exports = function(app) {
    var LocalStrategy, decorators, logger, mailer, models, passport, settings;
    passport = require("passport");
    LocalStrategy = require("passport-local").Strategy;
    decorators = require('../decorators');
    logger = require("../logger");
    models = require("./models");
    mailer = require('../mailer').mailer;
    settings = require('../../config');
    passport.serializeUser(function(user, done) {
      return done(null, user.id);
    });
    passport.deserializeUser(function(id, done) {
      return models.User.findOne({
        _id: id,
        active: true
      }, function(err, user) {
        return done(err, user);
      });
    });
    passport.use(new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password'
    }, function(username, password, done) {
      var User;
      User = models.User;
      return User.findOne({
        $or: [
          {
            username: username
          }, {
            email: username
          }
        ],
        active: true
      }, function(err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done(null, false, {
            message: 'Unknown user'
          });
        }
        if (!user.authenticate(password)) {
          return done(null, false, {
            message: 'Invalid password'
          });
        }
        return done(null, user);
      });
    }));
    app.get('/accounts/logout', function(req, res) {
      if (req.user) {
        req.logout();
      }
      return res.redirect('/');
    });
    app.get('/accounts/login', function(req, res, next) {
      return res.render('accounts/login');
    });
    app.post('/accounts/login', function(req, res, next) {
      var errors;
      req.assert('username', {
        regex: "Is required."
      }).len(2);
      req.assert('password', {
        len: 'Should have between 6 - 20 characters.'
      }).len(6, 20);
      errors = req.validationErrors(true);
      if (errors) {
        return res.render('accounts/login', {
          errors: errors,
          username: req.param('username'),
          password: req.param('password')
        });
      } else {
        return passport.authenticate('local', function(err, user, info) {
          if (err) {
            logger.error(err);
            return res.send(500);
          } else {
            if (user) {
              if (req.param('remember-me')) {
                req.session.cookie.expires = false;
                req.session.cookie.maxAge = 86400000 * 21;
              }
              return req.logIn(user, function(err) {
                if (err) {
                  return next(err);
                }
                return res.redirect('/profile/projects');
              });
            } else {
              return res.render('accounts/login', {
                error: "Invalid username or password",
                username: req.param('username'),
                password: req.param('password')
              });
            }
          }
        })(req, res, next);
      }
    });
    app.post('/accounts/user/photo/upload', decorators.loginRequired, function(req, res) {
      var user;
      if (req.files.photo.size === 0) {
        res.send(400);
        return;
      }
      user = req.user;
      user.photo = req.files.photo.path.split('/').pop();
      return user.save(function(err, doc) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.send(200);
        }
      });
    });
    app.get('/accounts/reset-password', function(req, res, next) {
      return res.render('accounts/reset-password');
    });
    app.post('/accounts/reset-password', function(req, res, next) {
      var errors;
      req.assert('email').isEmail();
      errors = req.validationErrors(true);
      if (errors) {
        return res.render('accounts/reset-password', {
          errors: errors
        });
      } else {
        return models.User.findOne({
          email: req.body.email
        }, function(err, user) {
          if (!user) {
            return res.render('accounts/reset-password', {
              errors: {
                email: {
                  msg: 'No account with that email address exists.'
                }
              }
            });
          } else {
            user.resetPassword = true;
            return user.save(function(err) {
              var context;
              if (err) {
                logger.error(err);
                return res.send(500);
              } else {
                context = {
                  url: "http://" + req.headers.host + "/accounts/reset-password/complete/" + user.resetPasswordToken
                };
                return mailer.send('mailer/accounts/reset-password', context, {
                  from: settings.mailer.noReply,
                  to: [user.email],
                  subject: settings.accounts.reset.subject
                }).then(function() {
                  return res.redirect('/accounts/reset-password/done');
                }).fail(function(reason) {
                  logger.error(reason);
                  return res.send(500);
                });
              }
            });
          }
        });
      }
    });
    app.get('/accounts/reset-password/done', function(req, res, next) {
      return res.render('accounts/reset-password-done');
    });
    app.get('/accounts/reset-password/complete/:token', function(req, res, next) {
      return models.User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {
          $gt: Date.now()
        }
      }, function(err, user) {
        if (!user) {
          return res.render("accounts/reset-password-complete", {
            message: 'Password reset token is invalid or has expired.',
            token: ''
          });
        } else {
          return res.render("accounts/reset-password-complete", {
            token: req.params.token
          });
        }
      });
    });
    return app.post('/accounts/reset-password/complete/:token', function(req, res, next) {
      var errors, password;
      password = req.body.password;
      req.assert('password', {
        regex: "Should contains from 4 to 15, letters(uppercase, downcase), digits, first should be a letter."
      }).regex(/^[a-zA-Z]\w{3,14}$/);
      req.assert('confirm', {
        regex: "Should contains from 4 to 15, letters(uppercase, downcase), digits, first should be a letter.",
        equals: "Passwords didn't match"
      }).regex(/^[a-zA-Z]\w{3,14}$/).equals(password);
      errors = req.validationErrors(true);
      if (errors) {
        return res.render('accounts/reset-password-complete', {
          errors: errors,
          token: req.params.token
        });
      } else {
        return models.User.findOne({
          resetPasswordToken: req.params.token,
          resetPasswordExpires: {
            $gt: Date.now()
          }
        }, function(err, user) {
          if (!user) {
            res.render("accounts/reset-password-complete", {
              message: 'Password reset token is invalid or has expired.',
              token: req.params.token
            });
          }
          user.password = req.body.password;
          user.resetPassword = false;
          return user.save(function(err) {
            return res.redirect('/accounts/login');
          });
        });
      }
    });
  };

}).call(this);
