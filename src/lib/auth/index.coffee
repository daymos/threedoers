passport = require "passport"
express = require "express"
LocalStrategy = require("passport-local").Strategy

logger = require "../logger"

models = require "./models"

app = module.exports = express()

# rules for serialize sessions (we need them as common part)
passport.serializeUser (user, done) ->
  done(null, user.id)

passport.deserializeUser (id, done) ->
  users.getOneRaw {_id: id}, (err, user) ->
    done err, user

# initialize passport itself and passport sessions
app.use passport.initialize()
app.use passport.session()

# local strategy (email, pass)
passport.use new LocalStrategy {
    usernameField: 'username',
    passwordField: 'password'
  },
  (username, password, done) ->
    User = models.User
    User.findOne {username: username}, (err, user) ->
      if err
        return done(err)
      if not user
        return done(null, false, {message: 'Unknown user'})
      if not user.authenticate (password)
        return done(null, false, {message: 'Invalid password'})
      return done(null, user)


app.get '/accounts/login', (req, res, next) ->
  res.render 'accounts/login'


app.post '/accounts/login', (req, res, next) ->

  req.assert('username', 'Invalid username').isAlpha()
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
          res.redirect '/'
        else
          res.render 'accounts/login', { error: "Invalid username or password", username: req.param('username'), password: req.param('password') }
    )(req, res, next)


app.get '/logout', (req, res) ->
  if not req.user? then return res.json()
  data = req.user._doc
  data.apn_token = undefined
  users.updateOne data, (err, user) ->
    req.logout()
    res.json()