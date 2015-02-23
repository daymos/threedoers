module.exports = (app) ->

  auth = require '../auth/models'
  uuid = require('node-uuid')
  logger = require '../logger'
  LocalStrategy = require("passport-local").Strategy
  passport = require "passport"
  decorators = require '../decorators'
  models = require('./models')
  fs = require('fs')
  gridfs = require '../gridfs'
  userModel = require('../auth/models')
  desigModel = require('../design/models.coffee')
  settings = require('../../config')


  app.post '/api/get_projects_for_user',(req,res) ->
    console.log '/api/get_projects_for_user'+req.query.token
    userModel.User.findOne({token: req.query.token}).exec().then( (user) ->
      if not user
        res.json
        status: -1
        error: 'No User found with this Access Token'
      else
        console.log "id user:"+user.id
        desigModel.STLDesign.findOne({"designer": user.id}).exec().then( (docs) ->
          if docs
            project=
             project_id: docs.id
             project_name: docs.title
             project_description: docs.description
             project_total_time_logged: 0
             project_status:true
             project_total_amount: 1000
             project_estimated_time: docs.hour
            projects = []
            projects.push(project)
            res.json
              status: 0
              error: null
              projects:projects
          else
            console.log "i DON'T have projects"
            res.json
              status: -1
              error: 'No Projects for this User'
        ).fail((reason) ->
            logger.error reason
            console.log "SERVER ERROR 1"
            res.json
              status: -1
              error: 'Server Error, please retry later'
        )

    ).fail((reason) ->
        logger.error reason
        console.log "SERVER ERROR 2"
        res.json
          status: -1
          error: 'Server Error, please retry later'
    )

  app.post '/api/create_work_session',(req,res) ->
    console.log '/api/create_work_session'+req.query
    console.log req.query
    console.log req.files.image.name
    userModel.User.findOne({token: req.query.token}).exec().then( (user) ->
      if not user
        res.json
        status: -1
        error: 'No User found with this Access Token'
      else
        console.log "gridfs test"
        a = gridfs.putFile(req.files.image.path,req.files.image.name+"1")
        console.dir a

    ).fail((reason) ->
      logger.error reason
      console.log "SERVER ERROR 2"
      res.json
        status: -1
        error: 'Server Error, please retry later'
    )

  app.post '/api/login',(req, res) ->
    console.log '/api/login'
    username = req.query.username
    password = req.query.password
    userModel.User.findOne({username: username}).exec().then( (user) ->

      if user
        if not user.authenticate (password)
          res.json
            status: -1
            error: 'Wrong Username or Password'
        else
          user.token = uuid.v4()
          user.save (err) ->
            if err
              res.json
              status: -1
              error: 'Server Error, please retry later'
              console.log err

          res.json
            status: 0
            error: null
            category:'designers'
            token:user.token
      else
      res.json
        status: -1
        error: 'Wrong Username or Password'

    ).fail((reason) ->
      logger.error reason
      res.json
        status: -1
        error: 'Server Error, please retry later'
    )