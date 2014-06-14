module.exports = (app, io) ->
  fs = require 'fs'
  exec = require('child_process').exec
  decimal = require('Deci-mal').decimal
  paypal = require('paypal-rest-sdk')

  decorators = require '../decorators'
  logger = require '../logger'
  mailer = require('../mailer').mailer
  settings = require('../../config')
  STLStats = require('../stlstat').STLStats
  gridfs = require '../gridfs'
  models = require('./models')
  utils = require('../utils')
  auth = require('../auth/models')

  paypal.configure(settings.paypal.api)

  app.get '/', (req, res) ->
    res.render 'core/index', {message: null, error: false, message: false}

  app.post '/', (req, res) ->
    req.assert('email').isEmail()
    errors = req.validationErrors(true)
    if errors
      res.render 'core/index',
        message: "OPS! THERE WAS AN ERROR! TRY AGAIN! <br/> #{errors.email.msg}"
        email: req.body.email
        error: true
    else
      models.Subscription.find(email: req.body.email).exec().then( (emails)->
        if emails.length > 0
          res.render 'core/index',
            message: "ALREADY SUBSCRIBED!"
            email: req.body.email
            error: true
        else
          s = new models.Subscription()
          s.email = req.body.email
          s.save()
          res.render 'core/index',
            message: "YOUR MAIL WAS SENT! THANK YOU!"
            email: req.body.email
            error: false
      )


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
    project.title = req.files.thumbnail.name
    project.file = req.files.thumbnail.path.split('/').pop()
    project.save (err, doc) ->
      if err
        logger.error err
        res.send 500
      else
        res.send redirectTo: "/project/#{project.id}"


  app.get '/project/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, $or: [{user: req.user.id}, {'order.printer': req.user.id}]}).exec().then( (doc) ->
      if doc
        unless doc.volume and not doc.bad
          processVolumeWeight(doc)
        res.render 'core/project/detail',
          project: doc
          colors: models.PROJECT_COLORS
          densities: models.PROJECT_DENSITIES
          statuses: models.PROJECT_STATUSES
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
      models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
        if doc
          if doc.editable
            doc.title = req.body.value
            doc.save()
            res.send 200
          else
            res.send "Project couldn't be editable at this status.", 400
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
          delete cloned.comments
          io.of('/project').in(doc._id.toHexString()).emit('update', cloned)

          processVolumeWeight(doc)
          res.send 200
        else
          res.send 404
      ).fail( ->
        logger.error arguments
        res.send 500
      )


  app.post '/project/order/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, editable: true}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REQUESTED[0])
        ammount =  Math.abs(if (req.body.ammount and parseInt(req.body.ammount)) then parseInt(req.body.ammount) else 1)
        doc.status = models.PROJECT_STATUSES.PRINT_REQUESTED[0]
        doc.order =
          ammount: ammount
          price: calculateOrderPrice(doc.price, ammount).toString()
        doc.save()
      res.redirect "/project/#{req.params.id}"
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.post '/project/comment/:id', decorators.loginRequired, (req, res, next) ->
    # Same as get /project/:id both printer who accepted and the owner can change this
    models.STLProject.findOne({_id: req.params.id, $or: [{user: req.user.id}, {'order.printer': req.user.id}]}).exec().then( (doc) ->
      if doc and doc.status >= models.PROJECT_STATUSES.PRINT_ACCEPTED[0]  # test if comments allowed
        if req.body.message
          comment =
            author: req.user.id
            username: req.user.username
            content: req.body.message
            createdAt: Date.now()

          doc.comments.push(comment)
          doc.save()
          res.json comment, 200
        else
          res.json msg: "The message is required.", 400
      else
        res.json msg: "Not allowed comments at this moment.", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.get '/project/pay/:id', decorators.loginRequired, (req, res, next) ->
    # Same as get /project/:id both printer who accepted and the owner can change this
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])  # test if comments allowed
        payment =
          intent: "sale"
          payer:
            payment_method: "paypal"

          redirect_urls:
            return_url: "#{settings.site}/project/pay/execute/#{doc.id}"
            cancel_url: "#{settings.site}/project/pay/cancel/#{doc.id}"

          transactions: [
            amount:
              total: doc.order.price
              currency: "USD"

            description: "Payment for 3D printing in 3doers"
          ]

        paypal.payment.create payment, (error, payment) ->
          if error
            logger.error error
            res.send 500
          else
            if payment.payer.payment_method is "paypal"
              req.session.paymentId = payment.id
              redirectUrl = undefined
              i = 0

              while i < payment.links.length
                link = payment.links[i]
                redirectUrl = link.href  if link.method is "REDIRECT"
                i++
              res.redirect redirectUrl
      else
        res.redirect "/project/#{req.params.id}"
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.get '/project/pay/cancel/:id', decorators.loginRequired, (req, res) ->
    delete req.session.paymentId
    res.redirect "/project/#{req.params.id}"


  app.get '/project/pay/execute/:id', decorators.loginRequired, (req, res) ->
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])  # test if next state is allowed
        auth.User.findOne(doc.order.printer).exec (err, user) ->
          paymentId = req.session.paymentId
          payerId = req.param("PayerID")
          details = payer_id: payerId
          paypal.payment.execute paymentId, details, (error, payment) ->
            if error
              logger.error error
            else
              mailer.send('mailer/project/payed', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.payed.subject}).then ->
                doc.status = models.PROJECT_STATUSES.PAYED[0]
                doc.save()

      res.redirect "/project/#{req.params.id}"
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.post '/project/start-printing/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, 'order.printer': req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINTING[0])
        doc.status = models.PROJECT_STATUSES.PRINTING[0]
        doc.save()
      res.redirect "/project/#{req.params.id}"
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.post '/project/printed/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, 'order.printer': req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINTED[0])
        doc.status = models.PROJECT_STATUSES.PRINTED[0]
        doc.save()
      res.redirect "/project/#{req.params.id}"
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.get '/printing/requests', decorators.printerRequired, (req, res) ->
    models.STLProject.find(status: models.PROJECT_STATUSES.PRINT_REQUESTED[0]).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        res.render 'core/printing/requests', {projects: docs}


  app.get '/printing/jobs', decorators.printerRequired, (req, res) ->
    models.STLProject.find('order.printer': req.user.id).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        res.render 'core/printing/jobs', {projects: docs}


  app.post '/printing/accept/:id', decorators.printerRequired, (req, res) ->
    models.STLProject.findOne({_id: req.params.id, editable: false}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_ACCEPTED[0])
        auth.User.findOne(doc.user).exec (err, user) ->
          if user
            mailer.send('mailer/printing/accept', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.printing.accept.subject}).then ->
              doc.status = models.PROJECT_STATUSES.PRINT_ACCEPTED[0]
              doc.order =
                printer: req.user.id
                ammount: doc.order.ammount
                price: doc.order.price
              doc.save()
              res.json msg: "Accepted"
      else
        res.json msg: "Looks like someone accepted, try with another", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  ###############################################
  # Socket IO event handlers
  ###############################################

  io.of('/project').on('connection', (socket) ->
    if socket.handshake.query.project?
      models.STLProject.findOne(
        {_id: socket.handshake.query.project, user: socket.handshake.session.passport.user},
        {title: 1, volume:1, status: 1, editable: 1}).exec().then( (doc) ->
        if doc
          socket.join(doc._id.toHexString())
          doc._doc.status = doc.humanizedStatus()
          io.of('/project').in(doc._id.toHexString()).emit 'update', doc._doc

          # for calculating order
          socket.on('order-price', (data) ->
            models.STLProject.findOne(doc._id).exec().then (doc) ->
              ammount =  Math.abs(if (data.ammount and parseInt(data.ammount)) then parseInt(data.ammount) else 1)
              price = calculateOrderPrice doc.price, ammount
              io.of('/project').in(doc._id.toHexString()).emit 'update-price-order', price: price.toString()
          )

        else
          socket.emit 'error', msg: "Document not found"
      ).fail( (reason) ->
        logger.error reason
        socket.emit 'error', msg: "Error searching for project. Mongo Error"
      )
    else
      socket.emit 'error', msg: "No project was not sent"
  )

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
          doc.price = decimal.fromNumber((doc.volume * 1.01 * doc.density * 0.03) + 5, 2)  # formula from doc sent by mattia
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


  calculateOrderPrice = (basePrice, ammount) ->
    if (basePrice<=10)
      decimal.fromNumber((3 + 2*basePrice) * ammount, 2)
    else
      decimal.fromNumber((23 + 10*Math.log(basePrice-9)) * ammount, 2)

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