(function() {
  var app, express, passport, users;

  passport = require("passport");

  users = require("users");

  express = require("express");

  app = module.exports = express();

  passport.serializeUser(function(user, done) {
    if (user)
    return done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    return users.getOneRaw({
      _id: id
    }, function(err, user) {
      return done(err, user);
    });
  });

}).call(this);
