module.exports = (app) ->

  auth = require '../auth/models'
  logger = require '../logger'
  decorators = require '../decorators'
  mailer = require('../mailer').mailer
  models = require('./models')

  app.get '/notifications', decorators.loginRequired, (req, res) ->
    models.Notification.find({recipient: req.user.id}).sort(createdAt: -1).limit(15).exec().then( (nots) ->
      console.log "you "+req.user.id+" have "+nots.length+" notifications"
      console.log nots
      res.render 'notification/notifications',
      userNotif: nots
    ).fail((reason) ->
      logger.error reason
      res.send 500
    )


  app.post '/getNotifications', decorators.loginRequired, (req, res) ->
    models.Notification.find({recipient: req.user.id, type:2, read: false}).exec().then( (nots) ->
       if nots
         res.json notifications:nots
       else
         res.json notifications:{}
    ).fail((reason) ->
      logger.error reason
      res.send 500
    )
