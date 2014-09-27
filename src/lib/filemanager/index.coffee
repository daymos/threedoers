module.exports = (app, io) ->
  models = require('./models')
  decorators = require '../decorators'
  logger = require '../logger'
  mailer = require('../mailer').mailer
  settings = require('../../config')
  auth = require('../auth/models')
  paypal = require('paypal-rest-sdk')


  app.get '/filemanager/projects', decorators.loginRequired, (req, res) ->
    models.FileProject.find({user: req.user._id, status: {"$ne": models.PROJECT_STATUSES.FINISHED[0]}}).exec().then( (docs) ->
      res.render 'filemanager/project/list_projects', {projects: docs}
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.post '/filemanager/upload', decorators.loginRequired, (req, res) ->
    if req.files.thumbnail.size == 0
      res.json errors:
        image: "This field is required"
      return

    # get the temporary location of the file
    tmp_path = req.files.thumbnail.path
    project = new models.FileProject
    project.user = req.user.id
    project.title = req.files.thumbnail.name
    project.original_file = req.files.thumbnail.path.split('/').pop()
    project.save (err, doc) ->
      if err
        logger.error err
        res.send 500
      else
        res.json redirectTo: "/filemanager/project/#{ project.id }"


  app.post '/filemanager/upload-review/:id', decorators.loginRequired, (req, res) ->
    if req.files.thumbnail.size == 0
      res.json errors:
        image: "This field is required"
      return

    models.FileProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.FINISHED[0])
        # get the temporary location of the file
        tmp_path = req.files.thumbnail.path
        doc.reviewed_file = req.files.thumbnail.path.split('/').pop()
        doc.status = models.PROJECT_STATUSES.FINISHED[0]
        doc.save (err, doc) ->
          if err
            logger.error err
            res.send 500
          else
            auth.User.findOne(doc.user).exec (err, user) ->
              if user
                mailer.send('mailer/filemanager/finished', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.filemanager.accept.subject}).then ->
                  res.json
                    msg: "Accepted"
                    redirectTo: "/filemanager/archived"
      else
        res.json msg: "Looks like someone accepted, try with another", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.get '/filemanager/requests', decorators.filemanagerRequired, (req, res) ->
    models.FileProject.find(status: {"$lt": models.PROJECT_STATUSES.PREACCEPTED[0], "$gt": models.PROJECT_STATUSES.FINISHED[0]}, 'filemanager': req.user.id).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        if docs and docs.length > 0
          res.render 'filemanager/requests', {projects: []}
        else
          models.FileProject.find(status: models.PROJECT_STATUSES.UPLOADED[0]).exec (err, docs) ->
            if err
              logger.error err
              res.send 500
            else
              res.render 'filemanager/requests', {projects: docs}


  app.get '/filemanager/jobs', decorators.filemanagerRequired, (req, res) ->
    models.FileProject.find('filemanager': req.user.id, status: {"$lt": models.PROJECT_STATUSES.FINISHED[0], "$gt": models.PROJECT_STATUSES.UPLOADED[0]}).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        res.render 'filemanager/jobs', {projects: docs}

  app.get '/filemanager/archived', decorators.loginRequired, (req, res) ->
    models.FileProject.find({filemanager: req.user._id, status: models.PROJECT_STATUSES.FINISHED[0]}).exec().then( (docs) ->
      res.render 'filemanager/archived', {projects: docs}
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.get '/filemanager/profile/archived', decorators.loginRequired, (req, res) ->
    models.FileProject.find({user: req.user._id, status: models.PROJECT_STATUSES.FINISHED[0]}).exec().then( (docs) ->
      res.render 'filemanager/project/list_projects', {projects: docs}
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.post '/filemanager/pre-accept/:id', decorators.filemanagerRequired, (req, res) ->
    models.FileProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PREACCEPTED[0])
        auth.User.findOne(doc.user).exec (err, user) ->
          if user
            mailer.send('mailer/filemanager/accept', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.filemanager.accept.subject}).then ->
              doc.status = models.PROJECT_STATUSES.PREACCEPTED[0]
              doc.filemanager = req.user.id
              doc.save()
              res.json msg: "Accepted"
      else
        res.json msg: "Looks like someone accepted, try with another", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.get '/filemanager/project/:id', decorators.loginRequired, (req, res, next) ->
    models.FileProject.findOne({_id: req.params.id, $or: [{user: req.user.id}, {filemanager: req.user.id}]}).exec().then( (doc) ->
      if doc
        res.render 'filemanager/project/detail',
          statuses: models.PROJECT_STATUSES
          project: doc
      else
        next()
    ).fail((reason) ->
      logger.error reason
      res.send 500
    )

  app.post '/filemanager/project/comment/:id', decorators.loginRequired, (req, res, next) ->
    # Same as get /project/:id both printer who accepted and the owner can change this
    models.FileProject.findOne({_id: req.params.id, $or: [{user: req.user.id}, {'filemanager': req.user.id}]}).exec().then( (doc) ->
      if doc and doc.status >= models.PROJECT_STATUSES.PREACCEPTED[0]  # test if comments allowed
        if req.body.message
          comment =
            author: req.user.id
            username: req.user.username
            photo: req.user.photo
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

  app.post '/filemanager/project/title/:id', decorators.loginRequired, (req, res) ->
    req.assert('value').len(4)
    errors = req.validationErrors(true)

    if errors
      res.send errors.value.msg, 400
    else
      models.FileProject.findOne({_id: req.params.id}).exec().then( (doc) ->
        if doc
          doc.title = req.body.value
          doc.save()
          res.send req.body.value, 200
        else
          res.send 404
      ).fail( ->
        logger.error arguments
        res.send 500
      )

  app.post '/filemanager/project/description/:id', decorators.loginRequired, (req, res) ->
    req.assert('value').len(4)
    errors = req.validationErrors(true)

    if errors
      res.send errors.value.msg, 400
    else
      models.FileProject.findOne({_id: req.params.id}).exec().then( (doc) ->
        if doc
          doc.description = req.body.value
          doc.save()
          res.send req.body.value, 200
        else
          res.send 404
      ).fail( ->
        logger.error arguments
        res.send 500
      )

  app.post '/filemanager/accept/:id', decorators.filemanagerRequired, (req, res) ->
    models.FileProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.ACCEPTED[0])
        auth.User.findOne(doc.user).exec (err, user) ->
          if user
            mailer.send('mailer/filemanager/accept', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.filemanager.accept.subject}).then ->
              doc.status = models.PROJECT_STATUSES.ACCEPTED[0]
              doc.save()
              res.json msg: "Accepted"
      else
        res.json msg: "Looks like someone accepted, try with another", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.post '/filemanager/deny/:id', decorators.filemanagerRequired, (req, res) ->
    models.FileProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      logger.debug doc.validateNextStatus(models.PROJECT_STATUSES.UPLOADED[0])
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.UPLOADED[0])
        doc.status = models.PROJECT_STATUSES.UPLOADED[0]
        doc.save()
        res.json msg: "Denied"
      if doc and doc.status == models.PROJECT_STATUSES.ACCEPTED[0]
        res.json msg: "Looks like someone accepted, try with another", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.post '/filemanager/project/pay/:id', decorators.loginRequired, (req, res, next) ->
    # Same as get /project/:id both printer who accepted and the owner can change this
    models.FileProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PAID[0])  # test if comments allowed
        totalPrice = parseFloat(doc.price)
        payment =
          intent: "sale"
          payer:
            payment_method: "paypal"

          redirect_urls:
            return_url: "#{settings.site}/filemanager/project/pay/execute/#{doc.id}"
            cancel_url: "#{settings.site}/filemanager/project/pay/cancel/#{doc.id}"

          transactions: [
            amount:
              total: totalPrice
              currency: "EUR"

            description: "Payment for 3D printing in 3doers"
          ]

        paypal.payment.create payment, (error, payment) ->
          if error
            logger.error error
            res.send 500
          else
            if payment.payer.payment_method is "paypal"
              req.session.paymentFilemanagerId = payment.id
              redirectUrl = undefined
              i = 0

              while i < payment.links.length
                link = payment.links[i]
                redirectUrl = link.href  if link.method is "REDIRECT"
                i++
              res.redirect redirectUrl
      else
        res.send 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.get '/filemanager/project/pay/cancel/:id', decorators.loginRequired, (req, res) ->
    delete req.session.paymentFilemanagerId
    res.redirect "/filemanager/project/#{req.params.id}"


  app.get '/filemanager/project/pay/execute/:id', decorators.loginRequired, (req, res) ->
    models.FileProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PAID[0])  # test if next state is allowed
        auth.User.findOne(doc.filemanager).exec (err, user) ->
          paymentFilemanagerId = req.session.paymentFilemanagerId
          payerId = req.param("PayerID")
          details = payer_id: payerId
          paypal.payment.execute paymentFilemanagerId, details, (error, payment) ->
            if error
              logger.error error
            else
              updatedData =
                status: models.PROJECT_STATUSES.PAID[0]

              doc.update updatedData, (error) ->
                unless error
                  mailer.send('mailer/filemanager/payed', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.payed.subject})

                res.redirect "/filemanager/project/#{req.params.id}"
    ).fail( ->
      logger.error arguments
      res.send 500
    )
