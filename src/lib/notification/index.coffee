module.exports = (app) ->

  auth = require '../auth/models'
  logger = require '../logger'
  decorators = require '../decorators'
  models = require('./models')

  app.get '/notifications', decorators.loginRequired, (req, res) ->
    models.Notification.find({recipient: req.user.id, type:2}).sort({createAt: 'desc'}).limit(15).exec().then( (nots) ->
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

  app.post '/notification/read/:id', decorators.loginRequired, (req,res) ->
    models.Notification.findOne({_id: req.params.id, read: false}).exec().then((notf) ->
      if notf
        console.log notf
        notf.read = true
        notf.save()
    ).fail((reason) ->
      logger.error reason
      res.send 500
    )