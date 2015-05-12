module.exports = (app) ->

  auth = require '../auth/models'
  registration = require './models'
  logger = require '../logger'
  mailer = require('../mailer').mailer
  settings = require '../../config'


  app.get '/accounts/signup', (req, res) ->
    res.render 'registration/signup'


  app.post '/accounts/signup', (req, res, next) ->
    password = req.body.password

    req.assert('username', regex: "Invalid username.").regex(/^[a-z0-9_-]{2,24}$/)
    req.assert('email').isEmail()
    req.assert('password', regex: "Should contains from 4 to 15, letters(uppercase, downcase), digits, first should be a letter.").regex(/^[a-zA-Z]\w{3,14}$/)
    req.assert('passwordConfirm', {regex: "Should contains from 4 to 15, letters(uppercase, downcase), digits, first should be a letter.", equals: "Passwords didn't match"}).regex(/^[a-zA-Z]\w{3,14}$/).equals(password)

    errors = req.validationErrors(true)

    if errors
      res.render 'registration/signup',
        errors: errors
        username: req.body.username
        email: req.body.email
    else
      auth.User.find($or: [{username: req.body.username}, {email: req.body.email}]).exec().then( (users)->
        if users.length > 0
          errors = {}

          for user in users
            if user.username == req.body.username
              errors.username =
                msg: "Username already taken."
            else if user.email == req.body.email
              errors.email =
                msg: "Email already taken."

          res.render 'registration/signup',
            errors: errors
            username: req.body.username
            email: req.body.email
        else

          ac = new registration.Activation
            email: req.body.email

          ac.save (err, activation, count) ->
            unless err
              context =
                url: "#{settings.site}/accounts/activation/#{activation.hashedEmail}"
                username: req.body.username

              mailer.send('mailer/accounts/registration', context, {from: settings.mailer.noReply, to:[activation.email], subject: settings.registration.activation.subject}).then ->
                user = new auth.User
                  username: req.body.username
                  email: req.body.email

                if req.body.city
                  user.city = req.body.city

                if req.body.country
                  user.country = req.body.country

                if req.body.address
                  user.address = req.body.address

                if req.body.location
                  location: req.body.location.split(',')

                user.password = req.body.password

                user.save ->
                  res.redirect '/accounts/signup/done'

            else
              next(err)

      ).fail( (reason) ->
        logger.error reason
        res.send 500
      )


  app.get '/accounts/signup/done', (req, res) ->
    res.render 'registration/activation'


  app.get '/accounts/activation/:hash', (req, res) ->
    registration.Activation.findOne(hashedEmail: req.params.hash, activated: false).exec().then( (activation) ->
      if activation
        activation.activated = true
        activation.save()
        auth.User.findOne(email: activation.email).exec().then (user) ->
          user.active = true
          user.save (err) ->
            if err
              logger.error err
              res.render 'registration/activation_done', activated: {}
            else
              res.render 'registration/activation_done', activated: user
      else
        res.render 'registration/activation_done', activated: {}
    ).fail( (reason) ->
      console.log reason
      logger.error reason
      res.send 500
    )
