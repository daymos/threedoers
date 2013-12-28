passport = require "passport"
users = require "users"
express = require "express"

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