(function() {
  var LocalStrategy, app, express, logger, models, passport;

  passport = require("passport");

  express = require("express");

  LocalStrategy = require("passport-local").Strategy;

  logger = require("../logger");

  models = require("./models");

  app = module.exports = express();

  passport.serializeUser(function(user, done) {
    return done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    return users.getOneRaw({
      _id: id
    }, function(err, user) {
      return done(err, user);
    });
  });

  app.use(passport.initialize());

  app.use(passport.session());

  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, function(username, password, done) {
    var User;
    User = models.User;
    return User.findOne({
      username: username
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

  app.get('/accounts/login', function(req, res, next) {
    return res.render('accounts/login');
  });

  app.post('/accounts/login', function(req, res, next) {
    var errors;
    req.assert('username', 'Invalid username').isAlpha();
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
            return res.redirect('/');
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

  app.get('/logout', function(req, res) {
    var data;
    if (req.user == null) {
      return res.json();
    }
    data = req.user._doc;
    data.apn_token = void 0;
    return users.updateOne(data, function(err, user) {
      req.logout();
      return res.json();
    });
  });

}).call(this);
