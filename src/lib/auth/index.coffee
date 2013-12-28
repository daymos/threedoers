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
    console.log User
    User.findOne {username: username}, (err, user) ->
      console.log user
      if err
        return done(err)
      if not user
        return done(null, false, {message: 'Unknown user'})
      if not user.authenticate (password)
        return done(null, false, {message: 'Invalid password'})
      return done(null, user)


app.get '/accounts/login/local', (req, res, next) ->
  res.render 'accounts/login'


app.post '/accounts/login/local', passport.authenticate('local'), (req, res, next) ->
  # stay login for 3 weeks
  logger.debug "post /auth/local auth local : ", req.isAuthenticated()
  logger.debug "stay_login : ", req.user
  if req.param('remember-me')
    req.session.cookie.expires = false
    req.session.cookie.maxAge = 86400000*21
  res.redirect '/'


app.get '/logout', (req, res) ->
  if not req.user? then return res.json()
  data = req.user._doc
  data.apn_token = undefined
  users.updateOne data, (err, user) ->
    req.logout()
    res.json()