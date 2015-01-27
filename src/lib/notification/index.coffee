module.exports = (app) ->

  auth = require '../auth/models'
  logger = require '../logger'
  decorators = require '../decorators'
  mailer = require('../mailer').mailer


  app.get '/notifications', decorators.loginRequired, (req, res) ->
      console.log "called notification"
      res.render 'notification/notifications'
