module.exports = (app) ->
  fs = require 'fs'
  auth = require '../auth/models'
  logger = require '../logger'
  decorators = require '../decorators'
  models = require('./models')
  Worksessions=require('../api/models')
  settings = require('../../config')
  utils = require('../utils')
  mailer = require('../mailer').mailer
  settings = require('../../config')

  app.get '/design/stl', decorators.loginRequired, (req, res) ->
      stringerror =""
      if req.query.error
        stringerror = req.query.error

      res.render 'design/ask/stl',{error:stringerror}


  app.get '/design/requests', decorators.filemanagerRequired, (req, res) ->
    #models.STLDesign.find({status:{"$lt":models.DESIGN_STATUSES.ARCHIVED[0]}}).elemMatch("proposal",{'user':req.user.id}).exec().then(( docs) ->
    models.STLDesign.find("$and":[{status:{"$lt":models.DESIGN_STATUSES.PREACCEPTED[0]}}, {"proposal":{"$not":{"$elemMatch":{"creator":req.user._id}}}}]).exec().then(( docs) ->
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

  #User accept id proposal
  app.post '/design/proposal/review/:id', decorators.loginRequired, (req, res) ->
    console.log "/design/proposal/review/:id"
    models.Proposal.findOne({_id: req.params.id, accepted:false}).exec().then( (prop) ->
      if prop
        prop.accepted = true
        prop.save()
        models.STLDesign.findOne({_id:prop.backref}).exec().then( (stldes) ->

          stldes.order =
            preAmount:prop.cost
            preHourly:prop.hour
            designer:prop.creator
            placedAt: new Date()
          stldes.status = models.DESIGN_STATUSES.PREACCEPTED[0]
          stldes.designer = prop.creator
          i = 0
          while i < stldes.proposal.length

            if ((stldes.proposal[i]._id).toString() == (prop._id).toString())
              stldes.proposal[i].accepted = prop.accepted
              break
            i++
          stldes.save()

        ).fail( ->
          logger.error arguments
          res.send 500
        )
        res.redirect "design/projects"
      else
        models.STLDesign.find({"creator": req.user.id}).exec().then( (doc) ->
          if doc
            res.render('design/proposal', {projects: doc, toApply:true, error:"Some errors for this proposal"})
        ).fail( ->
          logger.error arguments
          res.send 500
        )
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.get '/design/projects', decorators.loginRequired, (req, res) ->
    models.STLDesign.find({'creator': req.user.id, status: {"$lte": models.DESIGN_STATUSES.TIMEEEXPIRED[0]} }).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        console.log docs
        res.render 'design/project/list_projects', {projects: docs}

  app.get '/design/jobs', decorators.filemanagerRequired, (req, res) ->
    models.STLDesign.find(designer: req.user.id, status: {"$lt": models.DESIGN_STATUSES.DELIVERED[0], "$gte": models.DESIGN_STATUSES.UPLOADED[0]}).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        res.render 'design/jobs', {projects: docs}


  app.get '/design/detail/:id', decorators.loginRequired, (req, res) ->
    console.log req.params.id


  app.post '/design/proposal/:id', decorators.loginRequired, (req, res) ->
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc
        if req.body.hours and req.body.cost
          proposal= new models.Proposal
          proposal.creator = req.user.id
          proposal.username = req.user.username
          proposal.hour = req.body.hours
          proposal.backref = req.params.id
          proposal.cost = req.body.cost
          proposal.createAt = Date.now()
          proposal.save()
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

  app.get '/design/proposal', decorators.loginRequired, (req, res) ->
    models.STLDesign.find({"creator": req.user.id, status: {"$lt": models.DESIGN_STATUSES.PREACCEPTED[0]}}).exec().then( (doc) ->
      if doc
        res.render('core/profile/proposal', {projects: doc, toApply:true, error:""})

      else
        res.render('core/profile/proposal', {projects: doc, toApply:true, error:"No Design Proposal for you"})
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.get '/design/project/:id', decorators.loginRequired, (req, res, next) ->
    models.STLDesign.findOne({_id: req.params.id, $or: [{creator: req.user.id}, {designer: req.user.id}]}).exec().then( (doc) ->
      if doc
        Worksessions.WorkSession.find({"session_project_id":doc._id}).sort('session_date_stamp').exec().then((designSessions)->
            tmpList=designSessions
            designSessions=[]
            for session in tmpList
              subList=[]
              if (session.path)
                subList.append(session)
              else
                if (subList.length)
                  designSessions.append(subList)
                  subList=[]
          res.render 'design/project/detail',
            statuses: models.DESIGN_STATUSES,
            project: doc,
            designSessions:designSessions
        ).fail((reason)->
          console.log reason
          logger.error reason
          res.send 500
        )
      else
        res.redirect "/profile/projects"
    ).fail((reason) ->
      logger.error reason
      res.send 500
    )
  app.post '/design/accept/:id', decorators.filemanagerRequired, (req, res) ->
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc

        auth.User.findOne(doc.creator).exec (err, user) ->
          if user
#            mailer.send('mailer/printing/accept', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.printing.accept.subject}).then ->
            console.log 'doc'
            designer=''
            for proposal in doc.proposal
              if proposal.accepted
                designer=proposal.creator

            if designer!=''
              auth.User.findOne({_id:proposal.creator}).exec().then((user) ->
                  console.log 'inquert'
                  user.designJobs+=1
                  user.save()
                  doc.status = models.DESIGN_STATUSES.ACCEPTED[0]
                  doc.save()
                  res.json msg: "Accepted"
              ).fail( ->
                logger.error arguments
                res.send 500
              )
            else
              res.json msg: "Looks like someone accepted, try with another", 400

      #
#            # send notification
#            auth.User.where('_id').in([req.user.id, user.id]).exec().then (docs)->
#              if docs.length
#                utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> was accepted.", 'Status changed', 'info')
#                for user in docs
#                  mailer.send('mailer/project/status', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.status.subject})
      else
        res.json msg: "Looks like someone accepted, try with another", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )

  app.post '/design/deny/:id', decorators.filemanagerRequired, (req, res) ->
    console.log "/design/deny/:id"
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc
        console.log "got a project"
        doc.status -= 1
        doc.designer = ""
        i = 0
        console.log "I have "+doc.proposal.length+" proposal for this project"
        while i < doc.proposal.length
          if doc.proposal[i].accepted
            console.log "proposal "+i+" was accepted and now rejected"
            doc.proposal[i].accepted = false
            doc.proposal[i].rejected = true
            break
          else
            i++
        models.Proposal.findOne({'backref': req.params.id}).exec().then( (prop) ->
          if prop
            prop.accepted = false
            prop.rejected = true
            prop.save()
        ).fail( ->
          logger.error arguments
          res.send 500
        )
        doc.save()
        res.json msg: "Denied"
        # send notification
#        auth.User.where('_id').in([doc.user]).exec().then (docs)->
#          if docs.length
#            utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> is denied.", 'Status changed', 'info')
    ).fail( ->
      logger.error arguments
      res.send 500
    )


  app.post '/design/project/comment/:id', decorators.loginRequired, (req, res, next) ->
    models.STLDesign.findOne({_id: req.params.id, $or: [{creator: req.user.id}, {'designer': req.user.id}]}).exec().then( (doc) ->
      if doc
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
#          auth.User.where('_id').in([req.user.id, doc.designer]).exec().then (docs)->
#            if docs.length
#              utils.sendNotification(io, docs, "Project <a href='/project/#{doc.id}'>#{doc.title}</a> has new comment.", 'New Comment', 'info')
        else
          res.json msg: "The message is required.", 400
      else
        res.json msg: "Not allowed comments at this moment.", 400
    ).fail( ->
      logger.error arguments
      res.send 500
    )




  app.post '/design/stl/upload', decorators.loginRequired, (req, res) ->

    files = req.files.file;
    resources = []

    if (Array.isArray(req.files.file[0]))
      console.log "more then one file"
      if req.files.file[0].length>4
        i = 0;
        while i<files[0].length
          fs.unlinkSync files[0][i].path

          console.log "Removed"+files[0][i].path
          i++
        stringerror = encodeURIComponent("Too files")
        return res.redirect('/design/stl/?error='+stringerror)
      else
        i = 0;
        while i<files[0].length
          resources.push files[0][i].path.replace(/^.*[\\\/]/, '')
          console.log files[0][i].path.replace(/^.*[\\\/]/, '')
          i++
    else
      console.log "just one file"
      resources.push files[0].path.replace(/^.*[\\\/]/, '')
      console.log files[0].path.replace(/^.*[\\\/]/, '')

    console.log "RESOURCE FILE"
    console.log resources
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
        res.redirect "/design/proposal"
