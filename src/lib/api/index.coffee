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
            console.dir docs.order
            project=
             project_id: docs.id
             project_name: docs.title
             project_description: docs.description
             project_total_time_logged: docs.project_total_time_logged
             project_status:true
             project_total_amount: docs.order.preHourly*docs.order.preAmount
             project_estimated_time: docs.order.preHourly*60
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
            console.log "SERVER ERROR 1"+reason
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
    console.log '/api/create_work_session'
    console.log '&&&&&&&&&&&&&&&&&&&'
    console.log '&&&&&&&&&&&&&&&&&&&'
    console.log '&&&&&&&&&&&&&&&&&&&'
    console.log '&&&&&&&&&&&&&&&&&&&'
    console.log '&&&&&&&&&&&&&&&&&&&'
    userModel.User.findOne({token: req.query.token}).exec().then( (user) ->
      if not user
        console.log 'not user'
        res.json
        status: -1
        error: 'No User found with this Access Token'
      else
        console.log 'user'
        models.WorkSession.findOne({"session_project_id":req.query.project_id}).sort('-session_number').sort('-session_date_stamp').limit(1).exec().then( ( session) ->
          session_number = 0

          if session
            console.dir session
            session_number = session.session_number

          ws = new models.WorkSession
          if req.query.mode == 'start'
            ws.session_project_id = req.query.project_id
            ws.session_number = (session_number*1)+1
            ws.session_date_stamp = new Date(req.query.creation_date)
            ws.session_screen_shot = null
          else
            ws.session_project_id = req.query.project_id
            ws.session_number = (session_number*1)
            ws.session_date_stamp = new Date(req.query.creation_date)
            ws.session_screen_shot = req.files.image.path
            desigModel.STLDesign.findOne({_id: req.query.project_id}).exec().then((design) ->
              console.log 'create sessione'
              if design
                diffMs = ((new Date(req.query.creation_date)) - session.session_date_stamp)

                design.project_total_time_logged += Math.floor(((diffMs/1000) / 60))
                console.log 'totale stimato '+design.order.preHourly
                console.log 'totale loggato '+design.project_total_time_logged

                if design.project_total_time_logged>=design.order.preHourly
                  console.log 'ritardo rilevato'
                  user.token=null
                  user.onTime=false
                  design.status=desigModel.DESIGN_STATUSES.TIMEEEXPIRED[0]
                  user.numberOfDelay+=1
                  user.save()
                design.save()
            )
          ws.save ( err )->
            if err
              console.log "ws save "+err


          if !user.onTime
            console.log 'time expired'
            res.json
              status: -1
              error:'Time Expired'
          else
            console.log 'ok'
            res.json
              status: 0
              error: null
              project_id: req.query.project_id
              session_number: ws.session_number

        ).fail((reason) ->
          logger.error reason
          console.log "SERVER ERROR QUERYING WS"
          res.json
            status: -1
            error: 'Server Error, please retry later'
        )

    ).fail((reason) ->
      logger.error reason
      console.log "SERVER ERROR QUERYING USER"+reason
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
          if !user.onTime
            res.json
              status: -1
              error: 'Time expired'
              console.log err

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