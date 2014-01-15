module.exports = (app, io) ->
  fs = require 'fs'
  exec = require('child_process').exec

  decorators = require '../decorators'
  logger = require '../logger'
  mailer = require('../mailer').mailer
  settings = require('../../config')
  STLStats = require('../stlstat').STLStats
  gridfs = require '../gridfs'
  models = require('./models')
  utils = require('../utils')


  app.get '/', (req, res) ->
    res.render 'core/index'


  app.get '/become', decorators.loginRequired, (req, res) ->
    res.render 'core/become'


  app.post '/become', decorators.loginRequired, (req, res) ->
    if req.user.printer
      res.render 'core/become'
    else
      mailer.send('mailer/core/become',
                  {user: req.user},
                  {from: req.user.email, to: settings.admins.emails,
                  subject: "New Become a Printer Request"}).then ->
        req.user.printer = 'request'
        req.user.save()
      res.render 'core/become_done'


  app.get '/project/upload', decorators.loginRequired, (req, res) ->
    res.render 'core/project/upload'


  app.post '/project/upload', decorators.loginRequired, (req, res) ->
    if req.files.thumbnail.size == 0
      res.render 'core/project/upload', errors: thumbnail: msg: "This field is required"
      return
    # get the temporary location of the file
    tmp_path = req.files.thumbnail.path
    project = new models.STLProject
    project.user = req.user.id
    project.file = req.files.thumbnail.path.split('/').pop()
    project.save (err, doc) ->
      if err
        logger.error err
        res.send 500
      else
        res.send redirectTo: "/project/#{project.id}"

    processVolumeWeight(project)


  app.get '/project/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      if doc
        if doc.bad
          processVolumeWeight(doc)
        res.render 'core/project/detail', {project: doc, colors: models.PROJECT_COLORS, densities: models.PROJECT_DENSITIES}
      else
        next()
    ).fail((reason) ->
      logger.error reason
      res.send 500
    )


  app.get '/profile/projects', decorators.loginRequired, (req, res) ->
    models.STLProject.find({user: req.user._id}).exec().then( (docs) ->
      res.render 'core/profile/list_projects', {projects: docs}
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.get '/profile/archived', decorators.loginRequired, (req, res) ->
    models.STLProject.find({user: req.user._id, status: models.PROJECT_STATUSES.ARCHIVED[0]}).exec().then( (docs) ->
      res.render 'core/profile/list_projects', {projects: docs}
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.get '/profile/settings', decorators.loginRequired, (req, res) ->
    res.render 'core/profile/settings', {errors: {}}


  app.post '/profile/settings', decorators.loginRequired, (req, res) ->
    if (req.body.city && req.body.country && req.body.location)
      req.user.city = req.body.city
      req.user.country = req.body.country
      req.user.location = req.body.location

    req.user.firstName = req.body.firstName
    req.user.lastName = req.body.lastName
    req.user.save()
    res.render 'core/profile/settings'


  app.post '/project/title/:id', decorators.loginRequired, (req, res) ->
    req.assert('value').len(4)
    errors = req.validationErrors(true)

    if errors
      res.send errors.value.msg, 400
    else
      models.STLProject.findOne({_id: req.params.id, editable: true}).exec().then( (doc) ->
        if doc
          doc.title = req.body.value
          doc.save()
          res.send 200
        else
          res.send 404
      ).fail( ->
        logger.error arguments
        res.send 500
      )

  app.post '/project/color/:id', decorators.loginRequired, (req, res) ->
    req.assert('value').regex(/red|green|blue|black|white|yellow/)
    errors = req.validationErrors(true)

    if errors
      res.send errors.value.msg, 400
    else
      models.STLProject.findOne({_id: req.params.id, editable: true}).exec().then( (doc) ->
        if doc
          doc.color = req.body.value
          doc.save()
          res.send 200
        else
          res.send 404
      ).fail( ->
        logger.error arguments
        res.send 500
      )

  app.post '/project/density/:id', decorators.loginRequired, (req, res) ->
    value = parseFloat(req.body.value)
    unless value in [models.PROJECT_DENSITIES.LOW[0], models.PROJECT_DENSITIES.MEDIUM[0], models.PROJECT_DENSITIES.HIGH[0], models.PROJECT_DENSITIES.COMPLETE[0]]
      res.send 400
    else
      models.STLProject.findOne({_id: req.params.id, editable: true}).exec().then( (doc) ->
        if doc
          doc.density = value
          doc.status = models.PROJECT_STATUSES.PROCESSING[0]

          cloned = utils.cloneObject(doc._doc)
          cloned.status = doc.humanizedStatus()  # to show good in browser
          io.of('/project').in(doc._id.toHexString()).emit('update', cloned)

          processVolumeWeight(doc)
          res.send 200
        else
          res.send 404
      ).fail( ->
        logger.error arguments
        res.send 500
      )

  ###############################################
  # Socket IO event handlers
  ###############################################

  io.of('/project').on 'connection', (socket) ->
    if socket.handshake.query.project?
      models.STLProject.findOne({_id: socket.handshake.query.project, user: socket.handshake.session.passport.user}).exec().then( (doc) ->
        if doc
          socket.join(doc._id.toHexString())
          doc._doc.status = doc.humanizedStatus()
          console.log "/project/#{doc._id.toHexString()}"
          io.of('/project').in(doc._id.toHexString()).emit 'update', doc._doc
        else
          socket.emit 'error', msg: "Document not found"
      ).fail( (reason) ->
        logger.error reason
        socket.emit 'error', msg: "Error searching for project. Mongo Error"
      )
    else
      socket.emit 'error', msg: "No project was not sent"


  ###############################################
  # Some functions
  ###############################################

  processVolumeWeight = (doc) ->
    exec "#{settings.python.bin} #{settings.python.path} #{settings.upload.to}#{doc.file} -d #{doc.density}", (err, stdout, stderr) ->
      if not err and  not stderr
        try
          result = JSON.parse(stdout)
          doc.volume = result.volume
          doc.weight = result.weight
          doc.unit = result.unit
          doc.status = models.PROJECT_STATUSES.PROCESSED[0]
          doc.price = (doc.volume * 1.01 * doc.density * 0.03) + 5  # formula from doc sent by mattia
          doc.bad = false
          doc.save()
        catch e
          logger.error e
          logger.error stderr
          doc.bad = true
          doc.save()
      else
        doc.bad = true
        doc.save()

      cloned = utils.cloneObject(doc._doc)
      cloned.status = doc.humanizedStatus()  # to show good in browser

      io.of('/project').in(doc._id.toHexString()).emit('update', cloned)

# app.get "/", (req, res) ->

#   # check if the user's credentials are saved in a cookie //
#   unless req.user
#     res.redirect '/accounts/login/local'
#       title: "Hello - Please Login To Your Account"

#   else
#     # attempt automatic login //
#     AM.autoLogin req.cookies.user, req.cookies.pass, (o) ->
#       if o?
#         req.session.user = o
#         res.redirect "/home"
#       else
#         res.render "login",
#           title: "Hello - Please Login To Your Account"