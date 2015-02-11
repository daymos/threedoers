module.exports = (app) ->

  auth = require '../auth/models'
  logger = require '../logger'
  decorators = require '../decorators'
  models = require('./models')

  app.get '/ask/stl', decorators.loginRequired, (req, res) ->
      res.render 'ask/stl'


  app.post '/ask/stl/upload', decorators.loginRequired, (req, res) ->

    console.log req.files
