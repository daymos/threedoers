
module.exports = (app, io) ->
  fs = require 'fs'
  exec = require('child_process').exec
  decimal = require('Deci-mal').decimal
  Paypal = require('paypal-adaptive')
  request = require('request')

  decorators = require '../decorators'
  logger = require '../logger'
  mailer = require('../mailer').mailer
  settings = require('../../config')
  STLStats = require('../stlstat').STLStats
  gridfs = require '../gridfs'
  models = require('./models')
  utils = require('../utils')
  auth = require('../auth/models')
  shippo = require('shippo')('mattia.spinelli@zoho.com', 'mattia13')

  app.get '/', (req, res) ->
    if req.user
      res.redirect '/profile/projects'
#      models.STLProject.find().sort(createdAt: -1).limit(6).exec (err, projects) ->
#        auth.User.find().sort(createdAt: -1).limit(15).exec (err, users) ->
#          res.render 'core/index', {message: null, error: false, message: false, users: users, projects: projects}
    else
      res.render 'core/comming', {message: null, error: false, message: false}

  app.get '/home', (req, res) ->
    if req.user
      res.redirect '/profile/projects'
    else
      models.STLProject.find().sort(createdAt: -1).limit(6).exec (err, projects) ->
          auth.User.find().sort(createdAt: -1).limit(15).exec (err, users) ->
            res.render 'core/index', {message: null, error: false, message: false, users: users, projects: projects}

  app.post '/', (req, res) ->
    req.assert('email').isEmail()
    errors = req.validationErrors(true)
    if errors
      res.render 'core/comming',
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


  app.get '/become/filemanager', decorators.loginRequired, (req, res) ->
    res.render 'core/become_filemanager'


  app.post '/become/filemanager', decorators.loginRequired, (req, res) ->
    if req.user.filemanager
      res.render 'core/become_filemanager'
    else
      mailer.send('mailer/core/become',
                  {user: req.user},
                  {from: req.user.email, to: settings.admins.emails,
                  subject: "New Become a File manager Request"}).then ->
        req.user.filemanager = 'request'
        req.user.save()
      res.render 'core/become_filemanager'


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
      res.render 'core/become'


  app.get '/project/upload', decorators.loginRequired, (req, res) ->
    res.render 'core/project/upload'


  app.post '/project/upload', decorators.loginRequired, (req, res) ->
    if req.files.thumbnail.size == 0
      res.json errors: thumbnail: msg: "This field is required"
      return

    if req.files.thumbnail.type != 'application/octet-stream' or req.files.thumbnail.path.split('/').pop().split('.').pop().toLowerCase() != 'stl'
      res.json errors: thumbnail: msg: "Is not a valid format, you need to upload a STL file."
      fs.unlink(req.files.thumbnail.path)
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


  app.post '/project/:id/image/', decorators.loginRequired, (req, res) ->
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      if doc
        matches = req.body.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        unless matches.length == 3
          res.send 400
        else
          filename = doc.file.split('.')[0]
          fs.writeFile "#{ settings.upload.to + filename }.png", matches[2], 'base64', (err) ->
            if err
              logger.error err
            else
              doc.image = "#{ filename }.png"
              doc.save()
            res.send 200
    ).fail((reason) ->
      logger.error reason
      res.send 500
    )


  app.get '/project/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, $or: [{user: req.user.id}, {'order.printer': req.user.id}]}).exec().then( (doc) ->
      if doc
        if not doc.volume or doc.bad or not doc.dimension
          processVolumeWeight(doc)
        res.render 'core/project/detail',
          project: doc
          colors: models.PROJECT_COLORS
          materials: models.PROJECT_MATERIALS
          statuses: models.PROJECT_STATUSES
          countries: auth.EuropeCountries
      else
        next()
    ).fail((reason) ->
      logger.error reason
      res.send 500
    )


  app.get '/profile/projects', decorators.loginRequired, (req, res) ->
    if req.user.printer!="accepted" and req.user.filemanager!="accepted"
      models.STLProject.find({user: req.user._id, status: {"$lte": models.PROJECT_STATUSES.PRINT_REVIEW[0]}}).exec().then( (docs) ->
        res.render 'core/profile/list_projects', {projects: docs}
      ).fail( ->
        logger.error arguments
        res.send 500
      )
    else if req.user.printer=='accepted' and req.user.filemanager!="accepted"
      res.redirect "/printing/requests"
    else if req.user.printer!='accepted' and req.user.filemanager=="accepted"
      res.redirect "/design/requests"

  app.get '/profile/onprint', decorators.loginRequired, (req, res) ->
    models.STLProject.find({user: req.user._id, status: {"$lt": models.PROJECT_STATUSES.ARCHIVED[0], "$gt": models.PROJECT_STATUSES.PRINT_REQUESTED[0]}}).exec().then((docs) ->
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

  app.get '/profile/notifications', decorators.loginRequired, (req, res) ->
    res.render 'core/profile/notifications'

  app.post '/profile/settings', decorators.loginRequired, (req, res) ->
    if (req.body.city && req.body.country && req.body.location)
      req.user.city = req.body.city
      req.user.country = req.body.country
      req.user.location = req.body.location.split(',')
      req.user.address = req.body.address

    req.user.firstName = req.body.firstName
    req.user.lastName = req.body.lastName
    req.user.save (error, user)->
      res.render 'core/profile/settings'


  requestShippingRate = (address, project, res) ->
    auth.User.findOne({_id: project.order.printer}).exec().then( (printer) ->
      if printer
        shipping = (shipping) ->
          shippo.rate.list(object_id: shipping.object_id, currency: 'EUR').then((rates)->
            if rates.count and rates.count > 0
              rate = null
              price = 9999999999.0 # a lot
              for rate_tmp in rates.results
                price_tmp = parseFloat(rate_tmp.amount_local)
                if rate_tmp.object_purpose == "PURCHASE" and price > price_tmp and price_tmp > 0
                  rate = rate_tmp
                  price = price_tmp

              if rate
                project.update 'order.rate': rate, ->
                  return
                res.json
                  ok: 'successes'
                  address: address
                  charge: rate.amount_local
            else
              res.json
                message: "There is not rate, use another address"
          )

        if printer.printerAddress
          # if created and address is same
          if project.order.shipping and project.order.shipping.address_to == address.object_id
            logger.debug("Parcel already created")
            shipping(project.order.shipping)
          else
            data = {}
            shippo.parcel.create(
              length: if project.dimension.length > 10 then decimal.fromNumber(project.dimension.length, 4).toString() else 10
              width: if project.dimension.width > 10 then decimal.fromNumber(project.dimension.width, 4).toString() else 10
              height: if project.dimension.height > 10 then decimal.fromNumber(project.dimension.height, 4).toString() else 10
              distance_unit: project.unit
              weight: decimal.fromNumber(project.weight, 4).toString()
              mass_unit: 'g'
            ).then( (parcel) ->
              data['order.parcel'] = parcel
              submission_date = new Date()
              submission_date.setDate(submission_date.getDate() + 2)

              shippo.shipment.create(
                object_purpose: "PURCHASE"
                address_from: printer.printerAddress.object_id
                address_to: address.object_id
                parcel: parcel.object_id
                submission_type: 'DROPOFF'
                submission_date: submission_date)

            ).then( (shipping_tmp) ->
              data['order.shipping'] = shipping_tmp
              project.update data, (error) ->
                if error
                  logger.error error
              shipping(shipping_tmp)
            )

        else
          res.json
            message: "Printer doesn't have address, please contact support or printer to add address."
      else
        logger.warning "printer #{printer} do not exists"
        res.json
          message: "Printer don't exists, please contact support"
    ).fail( (reason) ->
      logger.error reason
      res.json
        message: reason.raw.message
    )

  app.get '/validate-address-and-rate/:id', decorators.loginRequired, (req, res) ->
    models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc
        # if has id we already validated but search for it
        if req.query.id
          address = req.user.shippingAddresses.id(req.query.id)
          requestShippingRate address, doc, res
          return
        else
          req.assert('name', len: 'This field is required.').len(2)
          req.assert('street1', len: 'This field is required.').len(2)
          req.assert('city', len: 'This field is required.').len(2)
          req.assert('zip_code', len: 'This field is required.').len(2)
          req.assert('phone_no', len: 'This field is required.').len(2)
          req.assert('country', len: 'This field is required.').len(2)

          errors = req.validationErrors(true)

          address =
            object_purpose: "PURCHASE"
            name: req.query.name
            company: req.query.company
            street1: req.query.street1
            street_no: req.query.street_no
            street2: req.query.street2
            city: req.query.city
            state: req.query.state
            zip: req.query.zip_code
            phone: req.query.phone_no
            country: req.query.country
            email: req.user.email

          if errors
            res.render 'core/profile/address_form',
              errors: errors
              title: title
              address: address
              postURL: postURL
              countries: auth.EuropeCountries
          else
            shippo.address.create(address).then( (address) ->
              req.user.shippingAddresses.push address
              req.user.save (error, user) ->
                if error
                  logger.error error
                  res.send 500
                else
                  requestShippingRate address, doc, res
            , (error) ->
              logger.error error
              res.json
                message: error.raw.message
              return
            )
      else
        res.send 400
    ).fail( (reason) ->
      logger.error reason
      res.send 500
    )


  # used for other views
  handleDirection = (req, res, title, postURL, callback) ->
    req.assert('name', len: 'This field is required.').len(2)
    req.assert('street1', len: 'This field is required.').len(2)
    req.assert('city', len: 'This field is required.').len(2)
    req.assert('zip_code', len: 'This field is required.').len(2)
    req.assert('phone_no', len: 'This field is required.').len(2)
    req.assert('country', len: 'This field is required.').len(2)

    errors = req.validationErrors(true)

    address =
      object_purpose: "PURCHASE"
      name: req.body.name
      company: req.body.company
      street1: req.body.street1
      street_no: req.body.street_no
      street2: req.body.street2
      city: req.body.city
      state: req.body.state
      zip: req.body.zip_code
      phone: req.body.phone_no
      country: req.body.country
      email: req.user.email

    if errors
      res.render 'core/profile/address_form',
        errors: errors
        title: title
        address: address
        postURL: postURL
        countries: auth.EuropeCountries
    else
      # validate with postmaster io
      shippo.address.create(address).then( (address) ->
        callback(address)
      , (error) ->
        logger.error(error)
        res.render 'core/profile/address_form',
              message: error.raw.message
              title: title
              address: address
              postURL: postURL
              countries: auth.EuropeCountries
      )


  app.get '/profile/settings/printer-direction', decorators.loginRequired, (req, res) ->
    res.render 'core/profile/address_form',
      errors: {}
      title: "<h1 class='page-title'><span>Printer</span></h1><h1 class='page-title'><span>Direction</span></h1>"
      address: req.user.printerAddress || {}
      postURL: '/profile/settings/printer-direction'
      countries: auth.EuropeCountries


  app.post '/profile/settings/printer-direction', decorators.loginRequired, (req, res) ->
    handleDirection(
      req,
      res,
      "<h1 class='page-title'><span>Printer</span></h1><h1 class='page-title'><span>Direction</span></h1>",
      '/profile/settings/printer-direction',
      (address) ->
        req.user.printerAddress = address
        req.user.save()
        res.redirect('/profile/settings')
    )


  app.get '/profile/settings/new-shipping-direction', decorators.loginRequired, (req, res) ->
    res.render 'core/profile/address_form',
      errors: {}
      title: "<h1 class='page-title'><span>New</span></h1><h1 class='page-title'><span>Direction</span></h1>"
      address: {}
      postURL: '/profile/settings/new-shipping-direction'
      countries: auth.EuropeCountries


  app.post '/profile/settings/new-shipping-direction', decorators.loginRequired, (req, res) ->
    handleDirection(
      req,
      res,
      "<h1 class='page-title'><span>New</span></h1><h1 class='page-title'><span>Direction</span></h1>",
      '/profile/settings/new-shipping-direction',
      (address) ->
        req.user.shippingAddresses.push address
        req.user.save((error, doc) ->
          if error
            logger.error error
        )
        res.redirect('/profile/settings')
    )


  app.get '/profile/settings/edit-shipping-direction/:id', decorators.loginRequired, (req, res) ->
    address = req.user.shippingAddresses.id(req.params.id)
    res.render 'core/profile/address_form',
      errors: {}
      title: "<h1 class='page-title'><span>Edit</span></h1><h1 class='page-title'><span>Direction</span></h1>"
      address: address
      postURL: "/profile/settings/edit-shipping-direction/#{ req.params.id }"
      countries: auth.EuropeCountries


  app.post '/profile/settings/edit-shipping-direction/:id', decorators.loginRequired, (req, res) ->
    address = req.user.shippingAddresses.id(req.params.id)
    handleDirection(
      req,
      res,
      "<h1 class='page-title'><span>Edit</span></h1><h1 class='page-title'><span>Direction</span></h1>",
      "/profile/settings/edit-shipping-direction/#{ req.params.id }"
      (newAddress) ->
        # updateing address
        address.contact = newAddress.contact
        address.company = newAddress.company
        address.line1 = newAddress.line1
        address.line2 = newAddress.line2
        address.line3 = newAddress.line3
        address.city = newAddress.city
        address.state = newAddress.state
        address.zip_code = newAddress.zip_code
        address.phone_no = newAddress.phone_no
        address.country = newAddress.country

        req.user.save()
        res.redirect('/profile/settings')
    )


  app.post '/profile/settings/delete-shipping-direction/:id', decorators.loginRequired, (req, res) ->
    req.user.shippingAddresses.id(req.params.id).remove()
    req.user.save (error, user) ->
      if error
        res.send 400
      else
        res.send 200


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
            res.send req.body.value, 200
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


  app.post '/project/material/:id', decorators.loginRequired, (req, res) ->
    value = req.body.value
    unless value of models.PROJECT_MATERIALS
      res.send 400
    else
      models.STLProject.findOne({_id: req.params.id, editable: true}).exec().then( (doc) ->
        if doc
          doc.density = models.PROJECT_MATERIALS[value][0]
          doc.material = value
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
    models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REQUESTED[0])
        ammount =  Math.abs(if (req.body.ammount and parseInt(req.body.ammount)) then parseInt(req.body.ammount) else 1)
        price = calculateOrderPrice(doc.price, ammount)
        printerPayment = decimal.fromNumber(price * 0.75, 2)
        doc.status = models.PROJECT_STATUSES.PRINT_REQUESTED[0]
        doc.order =
          ammount: ammount
          price: price.toString()
          printerPayment: printerPayment.toString()
          businessPayment: decimal.fromNumber(price - printerPayment, 2).toString()
          placedAt: new Date()

        doc.save()

        # send notification
        auth.User.find(printer: 'accepted').exec().then (docs)->
          if docs.length
            utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> is waiting for you.", 'New project', 'info')
            for user in docs
              mailer.send('mailer/project/status', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.status.subject})
      res.redirect "/project/#{req.params.id}"
    ).fail( ->
      console.log arguments
      logger.error arguments
      res.send 500
    )

  app.post '/project/comment/:id', decorators.loginRequired, (req, res, next) ->
    # Same as get /project/:id both printer who accepted and the owner can change this
    models.STLProject.findOne({_id: req.params.id, $or: [{user: req.user.id}, {'order.printer': req.user.id}]}).exec().then( (doc) ->
      if doc and doc.status >= models.PROJECT_STATUSES.PRINT_REVIEW[0]  # test if comments allowed
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

          # send notification
          auth.User.where('_id').in([req.user.id, doc.printer]).exec().then (docs)->
            if docs.length
              utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> has new comment.", 'New Comment', 'info')
        else
          res.json msg: "The message is required.", 400
      else
        res.json msg: "Not allowed comments at this moment.", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.post '/project/pay/:id', decorators.loginRequired, (req, res, next) ->
    # Same as get /project/:id both printer who accepted and the owner can change this
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])  # test if comments allowed
        printerPayment = parseFloat(doc.order.printerPayment)
        businessPayment = parseFloat(doc.order.businessPayment)

        if req.body.shippingMethod == 'shipping' and doc.order.rate
          businessPayment = decimal.fromNumber(businessPayment + parseFloat(doc.order.rate.amount), 2).toString()
          businessPayment = parseFloat(businessPayment)

        req.session.deliveryMethod = req.body.shippingMethod

        paypalSdk = new Paypal
          userId: settings.paypal.adaptive.user
          password:  settings.paypal.adaptive.password,
          signature: settings.paypal.adaptive.signature,
          appId: settings.paypal.adaptive.appId,
          sandbox:   settings.paypal.adaptive.debug

        auth.User.findOne({_id: doc.order.printer}).exec().then (user) ->
          if user
            payload =
              requestEnvelope:
                errorLanguage:  'en_US'
              actionType:     'PAY'
              currencyCode:   'EUR'
              feesPayer:      'EACHRECEIVER',
              memo:           'Payment for 3D printing in 3doers'
              returnUrl:      "#{settings.site}/project/pay/execute/#{doc.id}"
              cancelUrl:      "#{settings.site}/project/pay/cancel/#{doc.id}"
              receiverList:
                receiver: [
                  {
                      email:  '3doers@gmail.com',
                      amount: businessPayment,
                      primary: 'false'
                  },
                  {
                      email:  user.email,
                      amount: printerPayment,
                      primary: 'false'
                  }

                ]
            paypalSdk.pay payload, (err, response) ->
              if err
                logger.error err
                res.send 500
              else
                res.redirect response.paymentApprovalUrl
      else
        res.send 400
    ).fail( (reason) ->
      logger.error reason
      res.send 500
    )


  app.get '/project/pay/cancel/:id', decorators.loginRequired, (req, res) ->
    res.redirect "/project/#{req.params.id}"


  app.get '/project/pay/execute/:id', decorators.loginRequired, (req, res) ->
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])  # test if next state is allowed
        auth.User.findOne(doc.order.printer).exec (err, user) ->
          if err
            logger.error err
            res.send 500
          else
            updatedData =
              status: models.PROJECT_STATUSES.PRINTING[0]
              'order.deliveryMethod': req.session.deliveryMethod
            doc.update updatedData, (error) ->
              unless error
                # send notification
                utils.sendNotification(io, [user, req.user], "Project <a href='/project/#{doc.id}'>#{doc.title}</a> was paid.", 'Change Status', 'info')

                mailer.send('mailer/project/status', {project: doc, user: req.user, site:settings.site}, {from: settings.mailer.noReply, to:[req.user.email], subject: settings.project.status.subject})
                mailer.send('mailer/project/payed', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.payed.subject})

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

  app.post '/project/archive/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      # if doc and doc.validateNextStatus(models.PROJECT_STATUSES.ARCHIVED[0])
      doc.status = models.PROJECT_STATUSES.ARCHIVED[0]
      doc.save()
      res.redirect "/project/#{req.params.id}"

      # send notification
      auth.User.where('_id').in([req.user.id, doc.printer]).exec().then (docs)->
        if docs.length
          utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> was archived.", 'Status changed', 'info')
          for user in docs
            mailer.send('mailer/project/status', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.status.subject})
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.post '/project/printed/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, 'order.printer': req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINTED[0])
        auth.User.findOne({_id: doc.order.printer}).exec().then( (printer) ->
          if printer
            if printer.printerAddress
              if doc.order.deliveryMethod == 'pickup'
                doc.status = models.PROJECT_STATUSES.PRINTED[0]
                doc.save ->
                  res.redirect "/project/#{req.params.id}"
              else
                shippo.transaction.create(rate: doc.order.rate.object_id).then((transaction)->
                  updatedData =
                    status: models.PROJECT_STATUSES.SHIPPING[0]
                    'order.transaction': transaction

                  doc.update updatedData, (error) ->
                    unless error
                      res.redirect "/project/#{req.params.id}"
                )

              # send notification
              auth.User.where('id').in([req.user.id, doc.printer]).exec().then (docs)->
                if docs.length
                  utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> was printed.", 'Status changed', 'info')
                  for user in docs
                    mailer.send('mailer/project/status', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.status.subject})

            else
              res.send "Printer doesn't have address, please contact support or printer to add address."
          else
            logger.warning "printer #{printer} do not exists"
            res.send "Printer don't exists, please contact support"
        ).fail( ->
          console.log arguments
          res.send 500
        )
      else
        res.redirect "/project/#{req.params.id}"
    ).fail( ->
      console.log arguments
      res.send 500
    )


  app.post '/project/shipping-address/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      # test if new address or using one already used

      # res.redirect "/project/#{req.params.id}"
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.get '/printing/requests', decorators.printerRequired, (req, res) ->
    models.STLProject.find(status: {"$lt": models.PROJECT_STATUSES.ARCHIVED[0], "$gt": models.PROJECT_STATUSES.PRINT_REQUESTED[0]}, 'order.printer': req.user.id).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        printerJobs = req.user.printerJobs || 1  # backward compatibility
        models.STLProject.find(status: models.PROJECT_STATUSES.PRINT_REQUESTED[0]).exec (err, available) ->
          if err
            logger.error err
            res.send 500
          else
            if docs and docs.length > printerJobs
              res.render 'core/printing/requests', {projects: available, toApply: false}
            else
              res.render 'core/printing/requests', {projects: available, toApply: true}


  app.get '/printing/jobs', decorators.printerRequired, (req, res) ->
    models.STLProject.find('order.printer': req.user.id, status: {"$lt": models.PROJECT_STATUSES.ARCHIVED[0], "$gt": models.PROJECT_STATUSES.PRINT_REQUESTED[0]}).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        res.render 'core/printing/jobs', {projects: docs}

  app.get '/printing/archived', decorators.printerRequired, (req, res) ->
    models.STLProject.find('order.printer': req.user.id, status: models.PROJECT_STATUSES.ARCHIVED[0]).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        res.render 'core/printing/archived', {projects: docs}

  app.post '/printing/review/:id', decorators.printerRequired, (req, res) ->
    models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REVIEW[0])
        auth.User.findOne(doc.user).exec (err, user) ->
          if user
            mailer.send('mailer/printing/accept', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.printing.accept.subject}).then ->
              doc.status = models.PROJECT_STATUSES.PRINT_REVIEW[0]
              doc.order =
                printer: req.user.id
                ammount: doc.order.ammount
                price: doc.order.price
                printerPayment: doc.order.printerPayment
                businessPayment: doc.order.businessPayment
                placedAt: doc.order.placedAt
              doc.save()
              res.json msg: "Accepted"

            # send notification
            auth.User.where('_id').in([req.user.id, user.id]).exec().then (docs)->
              if docs.length
                utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> is being reviewed.", 'Status changed', 'info')
      else
        res.json msg: "Looks like someone accepted, try with another", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.post '/printing/accept/:id', decorators.printerRequired, (req, res) ->
    models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_ACCEPTED[0])
        auth.User.findOne(doc.user).exec (err, user) ->
          if user
            mailer.send('mailer/printing/accept', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.printing.accept.subject}).then ->
              doc.status = models.PROJECT_STATUSES.PRINT_ACCEPTED[0]
              doc.save()
              res.json msg: "Accepted"

            # send notification
            auth.User.where('_id').in([req.user.id, user.id]).exec().then (docs)->
              if docs.length
                utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> was accepted.", 'Status changed', 'info')
                for user in docs
                  mailer.send('mailer/project/status', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.status.subject})
      else
        res.json msg: "Looks like someone accepted, try with another", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.post '/printing/deny/:id', decorators.printerRequired, (req, res) ->
    models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REQUESTED[0])
        doc.status -= 1
        doc.save()
        res.json msg: "Denied"
        # send notification
        auth.User.where('_id').in([doc.user]).exec().then (docs)->
          if docs.length
            utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> is denied.", 'Status changed', 'info')

      if doc and doc.status == models.PROJECT_STATUSES.PRINT_ACCEPTED[0]
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

          # doc retrieve
          response = {}
          for key of doc._doc
            response[key] = doc._doc[key]
          response.status = doc.humanizedStatus()
          response.status_image = doc.dasherizedStatus()

          io.of('/project').in(doc._id.toHexString()).emit 'update', response

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

  io.of('/notification').on('connection', (socket) ->
    if socket.handshake.query.user?
      auth.User.findOne(_id: socket.handshake.query.user).exec().then( (doc) ->
        if doc
          socket.join("notification-#{doc._id.toHexString()}")
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
          console.log "processVolumeWeight called"
          # Calculate price
          material_price = if doc.material == 'ABS' then 0.5 else 0.5 * 1.1  # ABS
          density = doc.density
          fixed_cost = 8
          # outer shell volume - this calculate the ammount of material used for
          # the outher shell of the object that is printed at full density
          # I assume a thickness of 0.09 mm sperimentally checked
          # surface is in mm2 need to convert to cm2 for mattia formula

          v_s = result.surface / 100 * 0.09

          # calculate price for outer shell
          p_vs = v_s * density * material_price

          # volume infill - here I subtract the volume of the outer shell to the
          # total volume of object. This part of the object can be printed at
          # lower density

          v_i = (result.volume - v_s)
          p_vi = v_i * 0.20 * material_price

          # base price - just sum price for outer shell and inner filling

          pb = p_vs + p_vi

          # final price - add fixed cost then this is multiplied by amount
          price = pb + fixed_cost

          # another values
          doc.volume = result.volume
          doc.weight = result.weight
          doc.unit = result.unit
          doc.dimension = result.dimension
          doc.status = models.PROJECT_STATUSES.PROCESSED[0]
          doc.price = decimal.fromNumber(price, 2)  # formula from doc sent by mattia
          doc.surface = result.surface / 100
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
        logger.error e
        logger.error stderr

      cloned = utils.cloneObject(doc._doc)
      cloned.status = doc.humanizedStatus()  # to show good in browser

      io.of('/project').in(doc._id.toHexString()).emit('update', cloned)


  calculateOrderPrice = (basePrice, ammount) ->
      decimal.fromNumber(basePrice * ammount, 2)

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
