module.exports = (app) ->

  passport = require "passport"
  LocalStrategy = require("passport-local").Strategy

  decorators = require '../decorators'
  logger = require "../logger"
  models = require "./models"
  mailer = require('../mailer').mailer
  settings = require '../../config'

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
      User.findOne {$or: [{username: username}, {email: username}], active: true}, (err, user) ->
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

    req.assert('username', regex: "Is required.").len(2)
    req.assert('password', len: 'Should have between 4 - 24 characters.').len(2)

    errors = req.validationErrors(true)

    if errors
      res.render 'accounts/login', { errors: errors, username: req.param('username'), password: req.param('password')}
    else
      passport.authenticate('local', (err, user, info) ->
        if err
          console.log arguments
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


  app.post '/accounts/user/photo/upload', decorators.loginRequired, (req, res) ->
    if req.files.photo.size == 0
      res.send 400
      return

    user = req.user
    user.photo = req.files.photo.path.split('/').pop()

    user.save (err, doc) ->
      if err
        console.log arguments
        res.send 500
      else
        res.send 200

  app.get '/accounts/reset-password', (req, res, next) ->
    res.render 'accounts/reset-password'

  app.post '/accounts/reset-password', (req, res, next) ->
    req.assert('email').isEmail()

    errors = req.validationErrors(true)

    if errors
      res.render 'accounts/reset-password',
        errors: errors
    else
      models.User.findOne
        email: req.body.email
      , (err, user) ->
        unless user
          res.render 'accounts/reset-password', errors: email: msg: 'No account with that email address exists.'
        else
          user.resetPassword = true
          user.save (err) ->
            if err
              console.log arguments
              res.send 500
            else
              context =
                url: "http://#{ req.headers.host }/accounts/reset-password/complete/#{ user.resetPasswordToken }"
              mailer.send('mailer/accounts/reset-password', context, {from: settings.mailer.noReply, to:[user.email], subject: settings.accounts.reset.subject}).then( ->
                res.redirect '/accounts/reset-password/done'
              ).fail((reason)->
                console.log arguments
                res.send 500
              )

  app.get '/accounts/reset-password/done', (req, res, next) ->
    res.render 'accounts/reset-password-done'

  app.get '/accounts/reset-password/complete/:token', (req, res, next) ->
    models.User.findOne
      resetPasswordToken: req.params.token
      resetPasswordExpires:
        $gt: Date.now()
    , (err, user) ->
      unless user
        res.render "accounts/reset-password-complete",
          message: 'Password reset token is invalid or has expired.'
          token: ''
      else
        res.render "accounts/reset-password-complete", token: req.params.token

  app.post '/accounts/reset-password/complete/:token', (req, res, next) ->
    password = req.body.password
    req.assert('password', regex: "Should contains from 4 to 15, letters(uppercase, downcase), digits, first should be a letter.").regex(/^[a-zA-Z]\w{3,14}$/)
    req.assert('confirm', {regex: "Should contains from 4 to 15, letters(uppercase, downcase), digits, first should be a letter.", equals: "Passwords didn't match"}).regex(/^[a-zA-Z]\w{3,14}$/).equals(password)

    errors = req.validationErrors(true)

    if errors
      res.render 'accounts/reset-password-complete',
        errors: errors
        token: req.params.token
    else
     models.User.findOne
        resetPasswordToken: req.params.token
        resetPasswordExpires:
          $gt: Date.now()
      , (err, user) ->
        unless user
          res.render "accounts/reset-password-complete",
            message: 'Password reset token is invalid or has expired.'
            token: req.params.token
        user.password = req.body.password
        user.resetPassword = false
        user.save (err) ->
          res.redirect '/accounts/login'

