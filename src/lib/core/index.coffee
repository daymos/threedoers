
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
  designModels = require('../design/models')
  shippo = require('shippo')('mattia.spinelli@zoho.com', 'mattia13')

  # Hack for update docs instead of cron, this is for a while

  app.get (req, res, next) ->
    current = new Date()
    query = {'order.reviewStartAt': {$lt: new Date(current.getTime() - 86400000)}, status: {$lt: models.PROJECT_STATUSES.PAYED[0]}}
    models.STLProject.find(query).update({$set: {status: models.PROJECT_STATUSES.PRINT_REQUESTED[0]}})
    next()

  app.get '/stampatori', (req, res) ->
    res.render 'core/stampatori'

  app.get '/utenti', (req, res) ->
    res.render 'core/utenti'

  app.get '/api/printers', (req, res) ->
    q = req.query.q.split(' ')[0]
    query =
      printer: 'accepted'
      $or: [
        {username: {$regex: "#{ q }", $options: 'si'}}
        {email: {$regex: "#{ q }", $options: 'si'}}
      ]
    auth.User.find(query, {id: true, email:true, username: true}).limit(10).exec().then( (data) ->
      res.json data
    ).fail ->
      console.log arguments
      res.send 500

  app.get '/', (req, res) ->
    if req.user
      res.redirect '/profile/projects'
    else
      models.STLProject.find().sort(createdAt: -1).limit(6).exec (err, projects) ->
          auth.User.find().limit(15).exec (err, users) ->
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
    res.redirect '/profile/settings#upgradeYourProfile'


  app.post '/become/filemanager', decorators.loginRequired, (req, res) ->
    if req.user.filemanager
      res.redirect '/profile/settings#upgradeYourProfile'
    else
      if (req.body.designerType==undefined || (req.body.fiscalCode==undefined && req.body.VatNumber==undefined))
        return res.send 400

      mailer.send('mailer/core/become_designer',{user: req.user},{from: req.user.email, to: settings.admins.emails,subject: "New Become a File manager Request"}).then ->
        req.user.filemanager = 'request'
        req.user.designerType=req.body.designerType
        console.log(req.body)
        if (req.body.designerType=='private')
            req.user.fiscalCode=req.body.fiscalCode
        else
            req.user.VatNumber=req.body.VatNumber
        req.user.save((error, user) ->
          if error
            console.log arguments
            return res.send 500
          else
             return res.redirect '/profile/settings'
        )


  app.get '/become', decorators.loginRequired, (req, res) ->
    res.render 'core/become'


  app.post '/become', decorators.loginRequired, (req, res) ->
    if req.user.printer
      res.render 'core/profile/settings'
    else
      printer_model = req.body.printer_model
      printer_city = req.body.city
      printer_howlong = req.body.howlong
      mailer.send('mailer/core/become',{user: req.user,printer_model, printer_city, printer_howlong},{from: req.user.email, to: settings.admins.emails,subject: "New Become a Printer Request"}).then ->
        req.user.printer = 'request'
        req.user.save()
      res.redirect '/profile/settings'


  app.get '/project/upload', (req, res) ->
    res.render 'core/project/upload'


  app.post '/project/upload', (req, res) ->
    if req.files.thumbnail.size == 0
      res.json errors: thumbnail: msg: "This field is required"
      return

    # if req.files.thumbnail.type != 'application/octet-stream' or req.files.thumbnail.path.split('/').pop().split('.').pop().toLowerCase() != 'stl'
    if req.files.thumbnail.path.split('/').pop().split('.').pop().toLowerCase() != 'stl'
      res.json errors: thumbnail: msg: "Is not a valid format, you need to upload a STL file."
      fs.unlink(req.files.thumbnail.path)
      return

    # get the temporary location of the file
    tmp_path = req.files.thumbnail.path
    project = new models.STLProject
    try
      project.user = req.user.id
    catch e
       console.log e
    project.title = req.files.thumbnail.name
    project.file = req.files.thumbnail.path.split('/').pop()
    project.save (err, doc) ->
      if err
        console.log arguments
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
              console.log arguments
            else
              doc.image = "#{ filename }.png"
              doc.save()
            res.send 200
    ).fail((reason) ->
      console.log arguments
      res.send 500
    )


  app.get '/project/:id', (req, res, next) ->
    filterDict={_id: req.params.id}
    try
      unless req.user.admin
        filterDict.$or=[{user: req.user.id}, {'order.printer': req.user.id}]
    catch e
      console.log e

    models.STLProject.findOne(filterDict ).exec().then( (doc) ->
      if doc
        if not doc.volume or doc.bad or not doc.dimension
          processVolumeWeight(doc)

        if doc.order and doc.order.printer
          auth.User.findOne(_id: doc.order.printer).exec().then( (printer) ->
            res.render 'core/project/detail',
              project: doc
              printer: printer
              colors: models.PROJECT_COLORS
              materials: models.PROJECT_MATERIALS
              statuses: models.PROJECT_STATUSES
              countries: auth.EuropeCountries
          )
        else
          res.render 'core/project/detail',
              project: doc
              colors: models.PROJECT_COLORS
              materials: models.PROJECT_MATERIALS
              statuses: models.PROJECT_STATUSES
              countries: auth.EuropeCountries
      else
        next()
    ).fail((reason) ->
      console.log arguments
      res.send 500
    )
  app.get '/project/feedback/:id', (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc
        console.log doc
        return res.render 'core/project/feedback' ,doc:doc
      else
        return res.send 404
    ).fail((reason) ->
      console.log arguments
      return res.send 500
    )
  app.post '/project/feedback/:id', (req, res, next) ->
    console.log req.params.id
    models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc
        if (doc.rating)
          return res.send 401
        doc.rating =
          quality:parseFloat(req.body.quality)
          comunication:parseFloat(req.body.comunication)
          speed:parseFloat(req.body.speed)
          satisfation:parseFloat(req.body.satisfation)
        doc.save()
        return res.redirect '/project/feedback/'+req.params.id
      else
        return res.send 404
    ).fail((reason) ->
      console.log arguments
      return res.send 500
    )


  app.get '/profile/projects', decorators.loginRequired, (req, res) ->
    if req.user.printer!="accepted" and req.user.filemanager!="accepted"
      models.STLProject.find({user: req.user._id, status: {"$lte": models.PROJECT_STATUSES.PRINT_REVIEW[0]}}).sort(createdAt: -1).exec().then( (docs) ->
        res.render 'core/profile/list_projects', {projects: docs, printingProjects: [], designProjects: []}
      ).fail( ->
        console.log arguments
        res.send 500
      )
    else if req.user.printer=='accepted' and req.user.filemanager!="accepted"
      res.redirect "/printing/requests"
    else if req.user.printer!='accepted' and req.user.filemanager=="accepted"
      res.redirect "/design/requests"
    else if req.user.printer=='accepted' and req.user.filemanager=="accepted"
      res.redirect "/printing/requests"

  app.get '/profile/onprint', decorators.loginRequired, (req, res) ->
    models.STLProject.find({user: req.user._id, status: {"$lt": models.PROJECT_STATUSES.ARCHIVED[0], "$gt": models.PROJECT_STATUSES.PRINT_REQUESTED[0]}}).sort(createdAt: -1).exec().then((docs) ->
      res.render 'core/profile/list_projects', {projects: docs, printingProjects: [], designProjects: []}
    ).fail( ->
      console.log arguments
      res.send 500
    )




  app.get '/profile/archived', decorators.loginRequired, (req, res) ->
    models.STLProject.find({user: req.user._id, status: models.PROJECT_STATUSES.ARCHIVED[0]}).sort(createdAt: -1).exec().then( (printings) ->
        designModels.STLDesign.find({'creator': req.user.id, status: {"$lt": designModels.DESIGN_STATUSES.ARCHIVED[0]} }).exec().then((design) ->
          res.render 'core/profile/list_projects', {printingProjects: printings, designProjects: design, projects:[]}
        )
    ).fail( ->
      console.log arguments
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
    if (req.body.mailNotification=='on')
      req.user.mailNotification=true
    else
      req.user.mailNotification=false

    req.user.save (error, user)->
      if error
        console.log arguments

      res.render 'core/profile/settings'


  requestShippingRate = (address, project) ->
    auth.User.findOne({_id: project.order.printer}).exec().then( (printer) ->
      if printer
        shipping = (shipping) ->
          shippo.shipment.rates(shipping.object_id, 'EUR').then((rates)->
            if rates.count and rates.count > 0
              rate = null
              price = 9999999999.0 # a lot
              for rate_tmp in rates.results
                price_tmp = parseFloat(rate_tmp.amount_local)
                if rate_tmp.object_purpose == "PURCHASE" and rate_tmp.currency == 'EUR' and price > price_tmp and price_tmp > 0
                  rate = rate_tmp
                  price = price_tmp

              if rate
                project.update 'order.rate': rate, ->
                  console.log project.title + ": " + rate
                  return
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
                  console.log arguments
              shipping(shipping_tmp)
            )
      else
        logger.warning "printer #{printer} do not exists"

    ).fail( (reason) ->
      console.log arguments
    )

  # app.get '/validate-address-and-rate/:id', decorators.loginRequired, (req, res) ->
  #   models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
  #     if doc
  #       # if has id we already validated but search for it
  #       if req.query.id
  #         address = req.user.shippingAddresses.id(req.query.id)
  #         requestShippingRate address, doc, res
  #         return
  #       else
  #         req.assert('name', len: 'This field is required.').len(2)
  #         req.assert('street1', len: 'This field is required.').len(2)
  #         req.assert('city', len: 'This field is required.').len(2)
  #         req.assert('zip_code', len: 'This field is required.').len(2)
  #         req.assert('phone_no', len: 'This field is required.').len(2)
  #         req.assert('country', len: 'This field is required.').len(2)

  #         errors = req.validationErrors(true)

  #         address =
  #           object_purpose: "PURCHASE"
  #           name: req.query.name
  #           company: req.query.company
  #           street1: req.query.street1
  #           street_no: req.query.street_no
  #           street2: req.query.street2
  #           city: req.query.city
  #           state: req.query.state
  #           zip: req.query.zip_code
  #           phone: req.query.phone_no
  #           country: req.query.country
  #           email: req.user.email

  #         if errors
  #           res.render 'core/profile/address_form',
  #             errors: errors
  #             title: title
  #             address: address
  #             postURL: postURL
  #             countries: auth.EuropeCountries
  #         else
  #           shippo.address.create(address).then( (address) ->
  #             req.user.shippingAddresses.push address
  #             req.user.save (error, user) ->
  #               if error
  #                 console.log arguments
  #                 res.send 500
  #               else
  #                 requestShippingRate address, doc, res
  #           , (error) ->
  #             console.log arguments
  #             res.json
  #               message: error.raw.message
  #             return
  #           )
  #     else
  #       res.send 400
  #   ).fail( (reason) ->
  #     console.log arguments
  #     res.send 500
  #   )


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
        console.log arguments
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
        if req.user.shippingAddresses.length == 0
          address.active = true
        req.user.shippingAddresses.push address
        req.user.save((error, doc) ->
          if error
            console.log arguments
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

  app.post '/profile/settings/activate-shipping-direction/:id', decorators.loginRequired, (req, res) ->
    for address in req.user.shippingAddresses
      if address._id.equals(req.params.id)
        address.active = true
      else
        address.active = false

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
        console.log arguments
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
        console.log arguments
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
        console.log arguments
        res.send 500
      )


  app.post '/project/material/:id', decorators.loginRequired, (req, res) ->
    value = if req.body.value == models.PROJECT_MATERIALS.ANY[1] then 'ANY' else req.body.value

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
        console.log arguments
        res.send 500
      )

  app.get '/project/update/:id', decorators.loginRequired, (req, res) -> models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc
        shippo.transaction.retrieve(doc.order.transaction.object_id).then (data) ->
          doc.update {'order.transaction': data}, ->
            res.redirect "/project/#{req.params.id}"
      else
        res.send 404
    ).fail( ->
      console.log arguments
      res.send 500
    )

  app.post '/project/order/:id', decorators.loginRequired, (req, res, next) ->
    address = null
    for _address in req.user.shippingAddresses
      if _address.active
        address = _address
    # if not address ask user to add and activate an address before allowing to place an order
    unless address?
      res.redirect "/project/#{req.params.id}?msg=You don't have an active address, add and/or activate one it before order."
      return
    models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REQUESTED[0])
        ammount =  Math.abs(if (req.body.ammount and parseInt(req.body.ammount)) then parseInt(req.body.ammount) else 1)
        total_price = calculateOrderPrice(doc.price, ammount)
        taxes = decimal.fromNumber(total_price * 0.0522, 2)
        price = decimal.fromNumber(total_price - taxes, 2)
        printerPayment = decimal.fromNumber(price * 0.7105, 2)
        doc.status = models.PROJECT_STATUSES.PRINT_REQUESTED[0]
        doc.order =
          ammount: ammount
          price: price.toString()
          totalPrice: total_price.toString()
          taxes: taxes.toString()
          printerPayment: printerPayment.toString()
          businessPayment: decimal.fromNumber(price - printerPayment, 2).toString()
          placedAt: new Date()

        if req.body.printer and req.body.printer.match /^[0-9a-fA-F]{24}$/
          auth.User.findOne(_id: req.body.printer).exec().then( (printer) ->
            if printer
              doc.order.printer = req.body.printer
              doc.status = models.PROJECT_STATUSES.PRINT_REVIEW[0]
              doc.order.reviewStartAt = new Date()
              if printer.mailNotification
                mailer.send('mailer/project/offer', {project: doc, user: printer, site:settings.site}, {from: settings.mailer.noReply, to:[printer.email], subject: settings.project.status.subject})
            doc.save()
          ).fail ->
            doc.save()
        else
          doc.save()

          # send notification
          auth.User.find(printer: 'accepted').exec().then (docs)->
            if docs.length
              utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> is waiting for you.", 'New project', 'info')
              for user in docs
                if user.mailNotification
                  mailer.send('mailer/project/status', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.status.subject})

      res.redirect "/project/#{req.params.id}"
    ).fail( ->
      console.log arguments
      res.send 500
    )

  app.post '/project/delete/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, status: {$lt: models.PROJECT_STATUSES.PRINTING[0]}}).remove().exec().then( (doc) ->
      res.redirect "/profile/projects"
    ).fail( ->
      console.log arguments
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
          auth.User.where('_id').in([req.user.id, doc.order.printer]).exec().then (docs)->
            if docs.length
              utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> has new comment.", 'New Comment', 'info')
        else
          res.json msg: "The message is required.", 400
      else
        res.json msg: "Not allowed comments at this moment.", 400
    ).fail( ->
      console.log arguments
      res.send 500
    )

  app.post '/project/pay/:id', decorators.loginRequired, (req, res, next) ->
    # Same as get /project/:id both printer who accepted and the owner can change this
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])  # test if comments allowed
        printerPayment = parseFloat(doc.order.printerPayment)
        businessPayment = parseFloat(doc.order.totalPrice)

        unless doc.order.rate
          res.redirect "/project/#{ doc._id }?msg=Your project doesn't have a rate, please wait while we are collecting it."
          return

        # no more control of shipping method
        # if req.body.shippingMethod == 'shipping' and doc.order.rate
        businessPayment = decimal.fromNumber(businessPayment + parseFloat(doc.order.rate.amount), 2).toString()
        businessPayment = parseFloat(businessPayment)

        req.session.deliveryMethod = 'shipping' # req.body.shippingMethod

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
              actionType:     'PAY_PRIMARY'
              payKeyDuration: 'P29D'
              currencyCode:   'EUR'
              feesPayer:      'EACHRECEIVER',
              memo:           'Payment for 3D printing in 3doers'
              returnUrl:      "#{settings.site}/project/pay/execute/#{doc.id}"
              cancelUrl:      "#{settings.site}/project/pay/cancel/#{doc.id}"
              receiverList:
                receiver: [
                  {
                      email:  settings.paypal.primaryReceiver,
                      amount: businessPayment,  # total price
                      primary: 'true'
                  },
                  {
                      email:  user.paypalEmail,
                      amount: printerPayment,
                      primary: 'false'
                  }
                ]

            paypalSdk.pay payload, (err, response) ->
              if err
                console.log response.error
                res.send 500
              else
                doc.update {'order.payKey': response.payKey, 'order.secundaryPaid': false}, (error) ->
                  if error
                    console.log error
                    console.log arguments
                  else
                    res.redirect response.paymentApprovalUrl
      else
        res.send 400
    ).fail( (reason) ->
      console.log arguments
      res.send 500
    )


  app.get '/project/pay/cancel/:id', decorators.loginRequired, (req, res) ->
    res.redirect "/project/#{req.params.id}"


  app.get '/project/pay/execute/:id', decorators.loginRequired, (req, res) ->
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])  # test if next state is allowed
        auth.User.findOne(_id: doc.order.printer).exec (err, user) ->
          if err
            console.log arguments
            res.send 500
          else
            updatedData =
              status: models.PROJECT_STATUSES.PRINTING[0]
              'order.deliveryMethod': req.session.deliveryMethod
              'order.printingStartedAt': new Date()
            doc.update updatedData, (error) ->
              unless error
                # send notification
                utils.sendNotification(io, [user, req.user], "Project <a href='/project/#{doc.id}'>#{doc.title}</a> was paid.", 'Change Status', 'info')

                mailer.send('mailer/project/status', {project: doc, user: req.user, site:settings.site}, {from: settings.mailer.noReply, to:[req.user.email], subject: settings.project.status.subject})
                mailer.send('mailer/project/payed', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.payed.subject})

              res.redirect "/project/#{req.params.id}"
    ).fail( ->
      console.log arguments
      res.send 500
    )


  app.post '/project/start-printing/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, 'order.printer': req.user.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINTING[0])
        doc.status = models.PROJECT_STATUSES.PRINTING[0]
        doc.save()
      res.redirect "/project/#{req.params.id}"
    ).fail( ->
      console.log arguments
      res.send 500
    )

  app.post '/project/archive/:id', decorators.loginRequired, (req, res, next) ->
    models.STLProject.findOne({_id: req.params.id, user: req.user.id}).exec().then( (doc) ->
      # if doc and doc.validateNextStatus(models.PROJECT_STATUSES.ARCHIVED[0])
      doc.status = models.PROJECT_STATUSES.ARCHIVED[0]
      doc.save()
      res.redirect "/project/#{req.params.id}"

      # send notification
      auth.User.where('_id').in([req.user.id, doc.order.printer]).exec().then (docs)->
        if docs.length
          utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> was archived.", 'Status changed', 'info')
          for user in docs
            if user.mailNotification
              mailer.send('mailer/project/status', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.status.subject})
    ).fail( ->
      console.log arguments
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
                  doc.transaction = transaction
                  doc.update({'order.transaction': transaction, 'status': models.PROJECT_STATUSES.PRINTED[0]}, -> res.redirect "/project/#{req.params.id}" )

                )

              auth.User.where('_id').in([req.user.id, doc.order.printer]).exec().then (docs)->
                if docs.length
                  utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> was printed.", 'Status changed', 'info')
                  for user in docs
                    if user.mailNotification
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
      console.log arguments
      res.send 500
    )


  app.get '/printing/requests', decorators.printerRequired, (req, res) ->
    models.STLProject.find(status: {"$lt": models.PROJECT_STATUSES.ARCHIVED[0], "$gt": models.PROJECT_STATUSES.PRINT_REQUESTED[0]}, 'order.printer': req.user.id).sort(placedAt: -1).exec (err, docs) ->
      if err
        console.log arguments
        res.send 500
      else
        printerJobs = req.user.printerJobs || 1  # backward compatibility
        models.STLProject.find(status: models.PROJECT_STATUSES.PRINT_REQUESTED[0], user: {$ne: req.user.id}).exec (err, available) ->
          if err
            console.log arguments
            res.send 500
          else
            if docs and docs.length > printerJobs
              res.render 'core/printing/requests', {projects: available, toApply: false}
            else
              res.render 'core/printing/requests', {projects: available, toApply: true}


  app.get '/printing/jobs', decorators.printerRequired, (req, res) ->
    models.STLProject.find('order.printer': req.user.id, status: {"$lt": models.PROJECT_STATUSES.ARCHIVED[0], "$gt": models.PROJECT_STATUSES.PRINT_REQUESTED[0]}).sort(createdAt: -1).exec (err, docs) ->
      if err
        console.log arguments
        res.send 500
      else
        res.render 'core/printing/jobs', {projects: docs}

  app.get '/printing/archived', decorators.printerRequired, (req, res) ->
    models.STLProject.find('order.printer': req.user.id, status: models.PROJECT_STATUSES.ARCHIVED[0]).sort(createdAt: -1).exec().then( ( printings) ->
      designModels.STLDesign.find({'creator': req.user.id, status:  designModels.DESIGN_STATUSES.ARCHIVED[0]}).exec().then((design) ->
        res.render 'core/printing/archived', {printingProjects: printings, designProjects: design}
      )
    ).fail( (reason) ->
      console.log reason
      console.log arguments
      res.send 500
    )

  app.post '/printing/review/:id', decorators.printerRequired, (req, res) ->
    models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REVIEW[0])
        auth.User.findOne(_id: doc.user).exec (err, user) ->
          if user
            if user.mailNotification
              mailer.send('mailer/printing/accept', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.printing.accept.subject})
            doc.status = models.PROJECT_STATUSES.PRINT_REVIEW[0]
            doc.order =
                printer: req.user.id
                ammount: doc.order.ammount
                price: doc.order.price
                totalPrice: doc.order.totalPrice
                taxes: doc.order.taxes
                printerPayment: doc.order.printerPayment
                businessPayment: doc.order.businessPayment
                placedAt: doc.order.placedAt
                reviewStartAt: new Date
            doc.save()
            res.json msg: "Accepted"

            # send notification
            auth.User.where('_id').in([req.user.id, user.id]).exec().then (docs)->
              if docs.length
                utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> is being reviewed.", 'Status changed', 'info')
      else
        res.json msg: "Looks like someone accepted, try with another", 400
    ).fail( ->
      console.log arguments
      res.send 500
    )

  app.post '/printing/accept/:id', decorators.printerRequired, (req, res) ->
    models.STLProject.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc and doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_ACCEPTED[0])
        auth.User.findOne(_id: doc.user).exec (err, user) ->
          if user
            # Look for user address
            address = null
            for _address in user.shippingAddresses
              if _address.active
                address = _address
            unless address?
              res.json msg: "User doesn't have a shipping address please ask him to add an address and activate it.", 400
              return

            # Test if printer have an address
            unless req.user.printerAddress and req.user.printerAddress.object_id
              res.json msg: "You don't have a shipping address please add an address.", 400
              return

            unless req.user.paypalEmail
              res.json msg: "You don't have a valid paypal account, please go to settings and setup", 400
              return

            if user.mailNotification
              mailer.send('mailer/printing/accept', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.printing.accept.subject})

            doc.status = models.PROJECT_STATUSES.PRINT_ACCEPTED[0]
            doc.save( (error, project) ->
              unless error
                res.json msg: "Accepted"
                requestShippingRate(address, doc)
                # send notification
                auth.User.where('_id').in([req.user.id, user.id]).exec().then (docs)->
                  if docs.length
                    utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> was accepted.", 'Status changed', 'info')
                    for user in docs
                      if user.mailNotification
                        mailer.send('mailer/project/status', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.status.subject})
              else
                res.json "error saving project, please try again."
            )

      else
        res.json msg: "Looks like someone accepted, try with another", 400
    ).fail( ->
      console.log arguments
      res.send 500
    )

  app.post '/'


  app.post '/paypal/verify', decorators.printerRequired, (req, res) ->
    req.assert('email', 'valid email required').isEmail()
    errors = req.validationErrors()

    if errors
      res.redirect "/profile/settings"
      return

    paypalSdk = new Paypal
      userId: settings.paypal.adaptive.user
      password:  settings.paypal.adaptive.password
      signature: settings.paypal.adaptive.signature
      appId: settings.paypal.adaptive.appId
      sandbox:   settings.paypal.adaptive.debug

    payload =
      emailAddress: req.body.email
      matchCriteria: 'NAME'
      firstName: req.user.firstName
      lastName: req.user.lastName
      requestEnvelope:
        errorLanguage:  'en_US'

    paypalSdk.getVerifiedStatus payload, (message, response) ->
      if response.error
        res.redirect "/profile/settings?msg=#{ response.error[0].message }"
      else
        if response.accountStatus?
          req.user.paypalEmail = req.body.email
          req.user.save( (error, doc) ->
            res.redirect "/profile/settings?msg=Email was validated"
          )
        else
          res.redirect "/profile/settings?msg=Your account is not verified"


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
      console.log arguments
      res.send 500
    )


  app.get '/admin/project/archive/:id', decorators.loginRequired, (req, res) ->
    unless req.user.admin
      res.send 503
      return

    models.STLProject.findOne({_id: req.params.id, status: models.PROJECT_STATUSES.PRINTED[0]}).exec().then( (doc) ->

      unless doc
        res.send 404
        return

      doc.status = models.PROJECT_STATUSES.ARCHIVED[0]
      doc.save( ->
        res.redirect '/admin/projects'
      )
    )

  app.get '/admin/project/release-payment/:id', decorators.loginRequired, (req, res) ->
    unless req.user.admin
      res.send 503
      return

    models.STLProject.findOne({_id: req.params.id, $or: [{'order.secundaryPaid': false}, {'order.secundaryPaid': null}], status: models.PROJECT_STATUSES.PRINTED[0]}).exec().then( (doc) ->

      unless doc
        res.send 404
        return

      paypalSdk = new Paypal
        userId: settings.paypal.adaptive.user
        password:  settings.paypal.adaptive.password
        signature: settings.paypal.adaptive.signature
        appId: settings.paypal.adaptive.appId
        sandbox:   settings.paypal.adaptive.debug

      payload =
        payKey: doc.order.payKey
        requestEnvelope:
          errorLanguage:  'en_US'

      paypalSdk.executePayment payload, (message, response)->
        console.log "payment executed"
        if response.error
          console.log response.error
        else
          doc.update {'order.secundaryPaid': true}
        res.redirect '/admin/projects'
    ).fail ->
      console.log arguments
      res.redirect '/admin/projects'


  app.all '/goshippo-webhook/', (req, res) ->
    if req.body.object_id
      models.STLProject.findOne('order.transaction.object_id': req.body.object_id).exec().then( (doc) ->
        console.log "******************** GoShippo **********************"
        console.log typeof req.body
        console.log req.body
        console.log "******************** GoShippo **********************"
        if doc
          data = {}
          data['order.transaction'] = req.body
          if typeof req.body.tracking_status == 'string'
            req.body = JSON.parse(req.body)

          # test many options
          if req.body.tracking_status? and req.body.tracking_status.status == "TRANSIT" and not doc.order.secundaryPaid
            data['order.secundaryPaid'] = true
            console.log "Trying to pay"
            paypalSdk = new Paypal
              userId: settings.paypal.adaptive.user
              password:  settings.paypal.adaptive.password
              signature: settings.paypal.adaptive.signature
              appId: settings.paypal.adaptive.appId
              sandbox:   settings.paypal.adaptive.debug

            payload =
              payKey: doc.order.payKey
              requestEnvelope:
                errorLanguage:  'en_US'

            paypalSdk.executePayment payload, ->
              console.log "payment exec uted"
              console.log arguments

          if req.body.tracking_status? and req.body.tracking_status.status == "DELIVERED"
            data['status'] = models.PROJECT_STATUSES.ARCHIVED[0]

          doc.update data, (error) ->
            if error
              console.log error
              console.log arguments
            else
              res.send 200
        else
          res.send 404
      ).fail( ->
        console.log arguments
        res.send 500
      )
    else
      res.send 400

  app.post '/cron/update-rates', (req, res) ->
    models.STLProject.find( 'order.rate' : {"$exists": false} ).exec().then (docs) ->
      for project in docs
        auth.User.findOne(_id: project.user).exec().then (user) ->
          address = null
          for _address in user.shippingAddresses
            if _address.active
              address = _address
          if address?
            requestShippingRate(address, project)

    res.send 200


  app.post '/cron/delete-unused-projects', (req, res) ->
    current = new Date

    models.STLProject.find('status': models.PROJECT_STATUSES.PROCESSED[0], 'startedAt': {$lt: new Date(current.getTime() - 86400000 * 7)}).exec().then( (docs) ->
      for doc in docs
        fs.unlink(settings.upload.to + docs.file)
    ).fail ->
      console.log arguments
    res.send 200

  app.get '/admin/projects', decorators.loginRequired, (req, res) ->
    unless req.user.admin
      res.send 403  # forbidden if not admin
      return

    page = parseInt(req.query.page || 1)
    limit = parseInt(req.query.limit || 10)

    # ensure are valid params
    page = if page > 0 then page else 1
    limit = if limit > 1 then limit else 10

    skip = (page - 1) * limit

    models.STLProject.find({status: models.PROJECT_STATUSES.PRINTED[0]}).count().exec().then( (count) ->
      models.STLProject.find({status: models.PROJECT_STATUSES.PRINTED[0]}, null, {skip: skip, limit: limit}).exec().then( (projects) ->
        # generate pagination info
        pagination =
          hasPrev: page > 1  # if page > 1 of course will have prev
          hasNext: (skip + projects.length) < count # if skip plus projects length should be less than total
          page: page
          pages: Math.floor(if count % limit == 0 then count / limit else (count / limit) + 1)

        res.render 'admin/projects/list', {projects: projects, pagination: pagination}
      )
    ).fail ->
      console.log arguments
      res.send 500


  app.get '/robots.txt', (req, res) ->
   res.set 'Content-Type', 'text/plain'
   res.send 'User-agent: *\nDisallow: /pp.pdf\nDisallow: /terms.pdf\nSitemap: /sitemap.xml'

  app.get '/sitemap.xml', (req, res) ->
   res.render 'sitemap'
  


  ###############################################
  # Socket IO event handlers
  ###############################################

  io.of('/project').on('connection', (socket) ->
    if socket.handshake.query.project?
      models.STLProject.findOne(
        {_id: socket.handshake.query.project} #, user: socket.handshake.session.passport.user},
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
            models.STLProject.findOne(_id: doc._id).exec().then (doc) ->
              ammount =  Math.abs(if (data.ammount and parseInt(data.ammount)) then parseInt(data.ammount) else 1)
              price = calculateOrderPrice doc.price, ammount
              io.of('/project').in(doc._id.toHexString()).emit 'update-price-order', price: price.toString()
          )

        else
          socket.emit 'error', msg: "Document not found"
      ).fail( (reason) ->
        console.log arguments
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
        console.log arguments
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
          # Calculate price
          material_price = 0.5 # if doc.material == 'ABS' then 0.5 else 0.5 * 1.1  # ABS
          density =  1.01  # doc.density  # just for formula
          fixed_cost = 10
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
          doc.price = decimal.fromNumber(price, 2)  # formula from doc sent by mattia
          doc.surface = result.surface / 100
          doc.bad = false

          if result.dimension.width > models.PROJECT_BOUNDARIES.WIDTH[0]
            doc.checkWidth = false

          if result.dimension.length > models.PROJECT_BOUNDARIES.LENGTH[0]
            doc.checkLenght = false

          if result.dimension.height > models.PROJECT_BOUNDARIES.HEIGHT[0]
            doc.checkHeight = false

          if doc.status < models.PROJECT_STATUSES.PROCESSED[0]
            doc.status = models.PROJECT_STATUSES.PROCESSED[0]

          doc.save()
        catch e
          console.log arguments
          doc.bad = true
          doc.save()
      else
        doc.bad = true
        doc.save()
        console.log arguments

      cloned = utils.cloneObject(doc._doc)
      cloned.status = doc.humanizedStatus()  # to show good in browser

      io.of('/project').in(doc._id.toHexString()).emit('update', cloned)


  calculateOrderPrice = (basePrice, ammount) ->
    basePrice = parseFloat(basePrice)
    decimal.fromNumber((basePrice * ammount * 1.12) - (10 * (ammount - 1)), 2)

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
