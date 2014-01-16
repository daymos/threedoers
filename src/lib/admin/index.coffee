module.exports = (app) ->

  logger = require "../logger"
  auth = require "../auth/models"
  decorators = require '../decorators'

  app.get '/admin/users', decorators.adminRequired, (req, res) ->
    auth.User.find (err, users) ->
      res.render 'admin/users', users: users


  app.get '/admin/printer/request', decorators.adminRequired, (req, res) ->
    auth.User.find printer: "request" ,(err, users) ->
      res.render 'admin/printer_requests', users: users


  app.post '/admin/printer/accept/:id', decorators.adminRequired, (req, res) ->
    auth.User.findOne {_id:req.params.id, printer: "request"} ,(err, user) ->
      user.printer = "accepted"
      user.save()
      res.send 200


  app.get '/admin/printer/deny/:id', decorators.adminRequired, (req, res) ->
    auth.User.findOne {_id:req.params.id, printer: "request"} ,(err, user) ->
      user.printer = "denied"
      user.save()
      res.send 200