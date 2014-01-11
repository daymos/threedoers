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

    logger.info "#{settings.python.bin} #{settings.python.path} #{req.files.thumbnail.path} -d #{project.density}"

    exec "#{settings.python.bin} #{settings.python.path} #{req.files.thumbnail.path} -d #{project.density}", (err, stdout, stderr) ->
      if not err and  not stderr
        try
          result = JSON.parse(stdout)
          project.volume = result.volume
          project.weight = result.weight
          project.unit = result.unit
          project.status = models.PROJECT_STATUSES.PROCESSED[0]
          project.save()

          cloned = utils.cloneObject(project._doc)
          cloned.status = project.humanizedStatus()  # to show good in browser

          io.sockets.in(project._id.toHexString()).emit('update', cloned)
          logger.info "Project #{project._id} just processed."
        catch e
          logger.error e
          logger.error stderr
          project.bad = true
          project.save()
      else
        project.bad = true
        project.save()

  app.get '/project/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      if doc
        if doc.bad
          logger.info "#{settings.python.bin} #{settings.python.path} #{settings.upload.to}#{doc.file} -d #{doc.density}"
          exec "#{settings.python.bin} #{settings.python.path} #{settings.upload.to}#{doc.file} -d #{doc.density}", (err, stdout, stderr) ->
            if not err and  not stderr
              try
                result = JSON.parse(stdout)
                doc.volume = result.volume
                doc.weight = result.weight
                doc.unit = result.unit
                doc.status = models.PROJECT_STATUSES.PROCESSED[0]
                doc.bad = false
                doc.save(-> console.log arguments)

                cloned = utils.cloneObject(doc._doc)
                cloned.status = doc.humanizedStatus()  # to show good in browser

                io.sockets.in(doc._id.toHexString()).emit('update', cloned)
                logger.info "Project #{doc._id} just processed."
              catch e
                logger.error e
                logger.error stderr
        res.render 'core/project/detail', {project: doc}
      else
        next()
    ).fail((reason) ->
      logger.error reason
      res.send 500
    )


    # # set where the file should actually exists - in this case it is in the "images" directory
    # target_path = "C:/imake_0.2/app/public/uploads/" + req.files.thumbnail.name

    # # move the file from the temporary location to the intended location
    # fs.rename tmp_path, target_path, (err) ->
    #   throw err  if err

    #   # delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
    #   fs.unlink tmp_path, ->
    #     throw err  if err

    #     #res.send('File uploaded to: ' + target_path + ' - ' + req.files.thumbnail.size + ' bytes');
    #     console.log target_path
    #     exec "c:/gnu/wget/bin/wget -q -O - http://\t127.0.0.1:8081/imake/live_preview.php" + "?x=" + target_path, (error, stdout, stderr) ->
    #       console.log stdout
    #       vol = stdout

    #     setTimeout (->
    #       parts = vol.split("Volume")
    #       console.log parts
    #       res.render "upload_1",
    #         tg: req.files.thumbnail.name
    #         vol: parts[1]

    #     ), 2000

  ###############################################
  # Socket IO event handlers
  ###############################################

  io.of('/project').on 'connection', (socket) ->
    if socket.handshake.query.project?
      models.STLProject.findOne({_id: socket.handshake.query.project, user: socket.handshake.session.passport.user}).exec().then( (doc) ->
        if doc
          socket.join(socket.handshake.query.project)
          doc._doc.status = doc.humanizedStatus()
          socket.emit 'update', doc._doc
        else
          socket.emit 'error', msg: "Document not found"
      ).fail( (reason) ->
        logger.error reason
        socket.emit 'error', msg: "Error searching for project. Mongo Error"
      )
    else
      socket.emit 'error', msg: "No project was not sent"

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