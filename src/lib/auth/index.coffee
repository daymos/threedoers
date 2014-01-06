module.exports = (app) ->

  passport = require "passport"
  LocalStrategy = require("passport-local").Strategy

  logger = require "../logger"
  models = require "./models"

  # rules for serialize sessions (we need them as common part)
  passport.serializeUser (user, done) ->
    done(null, user.id)

  passport.deserializeUser (id, done) ->
    models.User.findOne {_id: id, active: true}, (err, user) ->
      done err, user

  # local strategy (email, pass)
  passport.use new LocalStrategy {
      usernameField: 'username',
      passwordField: 'password'
    },
    (username, password, done) ->
      User = models.User
      User.findOne {username: username, active: true}, (err, user) ->
        if err
          return done(err)
        if not user
          return done(null, false, {message: 'Unknown user'})
        if not user.authenticate (password)
          return done(null, false, {message: 'Invalid password'})
        return done(null, user)


  app.get '/accounts/logout', (req, res) ->
    if req.user
      req.logout()
    res.redirect '/'


  app.get '/accounts/login', (req, res, next) ->
    res.render 'accounts/login'


  app.post '/accounts/login', (req, res, next) ->

    req.assert('username', regex: "Invalid username.").regex(/^[a-z0-9_-]{3,16}$/)
    req.assert('password', len: 'Should have between 6 - 20 characters.').len(6, 20)

    errors = req.validationErrors(true)

    if errors
      res.render 'accounts/login', { errors: errors, username: req.param('username'), password: req.param('password')}
    else
      passport.authenticate('local', (err, user, info) ->
        if err
          logger.error err
          res.send(500)
        else
          if user
            if req.param('remember-me')
              req.session.cookie.expires = false
              req.session.cookie.maxAge = 86400000*21

            req.logIn user, (err) ->
              return next(err)  if err
              res.redirect '/'
          else
            res.render 'accounts/login', { error: "Invalid username or password", username: req.param('username'), password: req.param('password') }
      )(req, res, next)
