(function() {
  module.exports = function(app) {
    var LocalStrategy, decorators, logger, models, passport;
    passport = require("passport");
    LocalStrategy = require("passport-local").Strategy;
    decorators = require('../decorators');
    logger = require("../logger");
    models = require("./models");
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
        username: username,
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
        regex: "Invalid username."
      }).regex(/^[a-z0-9_-]{3,16}$/);
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
                return res.redirect('/');
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

    return app.post('/accounts/user/photo/upload', decorators.loginRequired, function(req, res) {
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
  };

}).call(this);
