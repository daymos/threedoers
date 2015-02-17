module.exports = (app) ->

  auth = require '../auth/models'
  logger = require '../logger'
  decorators = require '../decorators'
  models = require('./models')
  settings = require('../../config')

  app.get '/design/stl', decorators.loginRequired, (req, res) ->
      res.render 'design/ask/stl',{error:""}


  app.get '/design/requests', decorators.loginRequired, (req, res) ->
    #models.STLDesign.find({status:{"$lt":models.DESIGN_STATUSES.ARCHIVED[0]}}).elemMatch("proposal",{'user':req.user.id}).exec().then(( docs) ->
    models.STLDesign.find("$and":[{status:{"$lt":models.DESIGN_STATUSES.ARCHIVED[0]}}, {"proposal":{"$not":{"$elemMatch":{"user":req.user.id}}}}]).exec().then(( docs) ->
      if docs
         res.render 'design/requests', {projects: docs, toApply:true, error:""}
#      else
#        res.render 'design/requests', {projects: docs, toApply:true}
#        ###else
#          models.FileProject.find(status: models.PROJECT_STATUSES.UPLOADED[0]).exec (err, docs) ->
#            if err
#              logger.error err
#              res.send 500
#            else
#              res.render 'filemanager/requests', {projects: docs, toApply:true}
#        ###
      ).fail( ->
        logger.error arguments
        res.send 500
      )

  app.post '/design/proposal/:id', decorators.loginRequired, (req, res) ->
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc
        if req.body.hours and req.body.cost
          console.log "parameter filled"
          proposal={}
          proposal.user = req.user.id
          proposal.hour = req.body.hours
          proposal.cost = req.body.cost
          proposal.createAt = Date.now()
          doc.proposal.push(proposal)
          doc.save (err, doc) ->
            if err
              logger.error err
              res.send 500
            else
              res.redirect "/"
        else
          res.redirect('/design/requests', {projects: doc, toApply:true, error:"You must fill both fields in ProposalForm"})

      else
        res.send "Project couldn't be editable at this status.", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )



  app.post '/design/stl/upload', decorators.loginRequired, (req, res) ->

    files = [].concat(req.files.file);
    resources = []

    if files[0].length>4
      res.render 'design/ask/stl', {error: "Too files"}
    else
      i = 0;
      while i<files[0].length
        resources.push files[0][i].path.replace(/^.*[\\\/]/, '')
        i++
      console.log resources.length
      design = new models.STLDesign
      design.resources = resources
      design.creator = req.user.id
      design.title = req.body.title
      design.abstract = req.body.abstract
      design.description = req.body.stl_desc
      design.save (err) ->
        if err
          logger.error reason
          res.send 500
        else
          res.redirect "/home"
