module.exports = (app) ->
  fs = require 'fs'
  auth = require '../auth/models'
  logger = require '../logger'
  decorators = require '../decorators'
  models = require('./models')

  Worksession=require('../api/models').WorkSession
  userModel=require('../auth/models').User
  settings = require('../../config')
  utils = require('../utils')
  mailer = require('../mailer').mailer

  Paypal = require('paypal-adaptive')

  app.get '/design/stl', decorators.loginRequired, (req, res) ->
      stringerror =""
      if req.query.error
        stringerror = req.query.error

      res.render 'design/ask/stl',{error:stringerror}


  app.get '/design/requests', decorators.filemanagerRequired, (req, res) ->
    #models.STLDesign.find({status:{"$lt":models.DESIGN_STATUSES.ARCHIVED[0]}}).elemMatch("proposal",{'user':req.user.id}).exec().then(( docs) ->
    models.STLDesign.find("$and":[{status:{"$lt":models.DESIGN_STATUSES.ACCEPTED[0]}}, {"proposal":{"$not":{"$elemMatch":{"creator":req.user._id}}}}]).sort(createdAt: -1).exec().then(( docs) ->
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
    models.Proposal.findOne({_id: req.params.id, accepted:false}).exec().then( (prop) ->
      if prop
        prop.accepted = true
        prop.save()
        console.log 'prop save'
        models.STLDesign.findOne({_id:prop.backref}).exec().then( (stldes) ->
          stldes.proposalSelected=true;
          stldes.order =
            preAmount:prop.cost
            preHourly:prop.hour
            designer:prop.creator
            placedAt: new Date()
          i = 0
          while i < stldes.proposal.length
            if ((stldes.proposal[i]._id).toString() == (prop._id).toString())
              stldes.proposal[i].accepted = prop.accepted
              break
            i++
          auth.User.findOne({_id:prop.creator}).exec().then((user) ->
            user.designJobs+=1
            user.save()
            stldes.designer = prop.creator
            stldes.status = models.DESIGN_STATUSES.ACCEPTED[0]
            console.log 'stl save'
            stldes.save()
            res.redirect "design/project/"+stldes._id
          ))
      else
        res.send 404
    ).fail( ->
      logger.error arguments
      res.send 500
    )
  app.get '/design/projects', decorators.loginRequired, (req, res) ->
    models.STLDesign.find({'creator': req.user.id, status: {"$lt": models.DESIGN_STATUSES.ARCHIVED[0]} }).sort(createdAt: -1).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        auth.User.findOne({_id:req.user.id}).exec().then((user) ->
          if user
            if user.printer=='accepted'
              return res.render 'design/project/list_projects_for_printer', {projects: docs}

          res.render 'design/project/list_projects', {projects: docs}
        ).fail( ->
          logger.error arguments
          res.send 500
        )


  app.get '/design/jobs', decorators.filemanagerRequired, (req, res) ->

    models.STLDesign.find($or:[ {"proposal":{"$elemMatch":{"creator":req.user.id,"proposalSelected":false}}},$and: [designer: req.user.id, status: {"$lt": models.DESIGN_STATUSES.DELIVERED[0], "$gte": models.DESIGN_STATUSES.UPLOADED[0]}]]).sort(createdAt: -1).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        res.render 'design/jobs', {projects: docs}

  app.get '/design/archived', decorators.filemanagerRequired, (req, res) ->
    models.STLDesign.find({designer: req.user.id, status:{"$gte" : models.DESIGN_STATUSES.DELIVERED[0]}}).sort(createdAt: -1).exec (err, docs) ->
      if err
        logger.error err
        res.send 500
      else
        res.render 'design/archived', {projects: docs}


  app.get '/design/detail/:id', decorators.loginRequired, (req, res) ->
    console.log req.params.id


  app.post '/design/proposal/:id', decorators.loginRequired, (req, res) ->
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc
        if req.body.hours and req.body.cost
          proposal= new models.Proposal
          proposal.creator = req.user.id
          proposal.username = req.user.username
          proposal.userRate=req.user.rate
          computed=req.user.numberOfDelay/req.user.designJobs*100
          if(!isNaN(computed))
            proposal.timeRate=computed
          proposal.hour = req.body.hours
          proposal.backref = req.params.id
          proposal.cost = req.body.cost
          proposal.createAt = Date.now()
          console.log(proposal, proposal.timeRate)
          console.log 'before'
          proposal.save()
          console.log 'after'
          console.log proposal.timeRate
          doc.proposal.push(proposal)
          console.log doc
          doc.save()
          console.log 'save'
          res.redirect "/profile/projects"
        else
          res.redirect('/design/requests', {projects: doc, toApply:true, error:"You must fill both fields in ProposalForm"})
      else
        res.send "Project couldn't be editable at this status.", 400
    ).fail( ->
      console.log 'fail'
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
    models.STLDesign.findOne({_id: req.params.id, $or: [{creator: req.user.id}, $or:[ {designer: req.user.id},designer:{ $exists: false },{"proposal":{"$elemMatch":{"creator":req.user.id}}}]]}).exec().then( (doc) ->
      if doc

        Worksession.find({"session_project_id":doc._id}).sort('session_date_stamp').exec().then((tmpList)->
            designSessions=[]
            if tmpList
              tmpList.shift()
            innerlist=[]
            for session in tmpList

              if (session.session_screen_shot!=null)
                 innerlist.push(session)
              else
                 if (innerlist.length)
                  designSessions.push(innerlist)
                 innerlist=[]

            if (innerlist.length)
              designSessions.push(innerlist)
            if (doc.designer)
              userModel.findOne({_id:doc.designer}).exec().then( (designer) ->
                console.log designer
                res.render 'design/project/detail',
                    statuses: models.DESIGN_STATUSES,
                    project: doc,
                    adminMail:settings.admins.emails,
                    designSessions:designSessions,
                    payment : settings.payment,
                    designer:designer
              )
            else
              res.render 'design/project/detail',
                statuses: models.DESIGN_STATUSES,
                project: doc,
                adminMail:settings.admins.emails,
                designSessions:designSessions,
                payment : settings.payment,
                designer:undefined
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
  app.post '/design/stl/complete/:id',decorators.loginRequired,(req, res, next) ->
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (design) ->
      if design
        userModel.findOne({_id:design.designer}).exec().then( (user) ->
          if user
            files = req.files.file;
            if (Array.isArray(req.files.file[0]))
              stringerror = encodeURIComponent("Too files")
              return res.redirect('design/project/'+req.params.id+'?error='+stringerror)
            else
              user.onTime=true
              design.final_stl= files[0].path.replace(/^.*[\\\/]/, '')
              design.status=models.DESIGN_STATUSES.DELIVERED[0]
              paypalSdk = new Paypal
                userId: settings.paypal.adaptive.user
                password:  settings.paypal.adaptive.password
                signature: settings.paypal.adaptive.signature
                appId: settings.paypal.adaptive.appId
                sandbox:   settings.paypal.adaptive.debug

              payload =
                payKey: design.payKey
                requestEnvelope:
                  errorLanguage:  'en_US'

              paypalSdk.executePayment payload

              if (design.timeExpiredPayKey)
                payload =
                  payKey: design.timeExpiredPayKey
                  requestEnvelope:
                    errorLanguage:  'en_US'

                paypalSdk.executePayment payload, ->

              design.save()
              user.save()
              userModel.findOne({_id:design.creator}).exec().then( (creator) ->
                if creator
                  if creator.mailNotification
                    mailer.send('mailer/design/completed',{project: design,url: "http://#{ req.headers.host }/design/project/"+design._id},{from: settings.mailer.noReply, to: creator.email,subject: "Design project "+design.title+' completed'})
                  if (user.VatNumber)
                    mailer.send('mailer/design/vatnumber',{designer: user,design:design,user:creator},{from: settings.mailer.noReply, to: settings.admins.emails,subject: "Paied designer with VAT number"})
                  res.redirect 'design/project/'+req.params.id
                else
                  res.send 500
              )
          else
            res.send 500
        )
      else
        res.send 404
    ).fail( (error)->
      console.log error
      logger.error arguments
      res.send 500
    )
  app.post '/design/stl/denyMoreTime/:id',decorators.loginRequired, (req,res)->
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (design) ->
      if design
          design.status=models.DESIGN_STATUSES.TIMEEXPIREDPROCESSED[0]
          design.save (err) ->
            if err
              logger.error reason
              res.send 500
            else
              userModel.findOne({_id:design.designer}).exec().then( (designer) ->
                if designer
                  designer.onTime=true
                  designer.save()
                else
                  logger.error 'designer not found'
                  res.send 500
              ).fail( (error)->
                logger.error error
                res.send 500
              )
              return res.redirect 'design/project/'+design.id
      else
        res.send 404
    ).fail( (error) ->
      logger.error error

      res.send 500
    )

  app.post '/design/stl/confirmMoreTime/:id',decorators.loginRequired, (req,res)->
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (design) ->
      if design
        moreTime=parseInt(req.body.moreTime)
        if (design.additionalHourRequested==moreTime)
          oldValue=design.order
          design.order=
            preHourly:oldValue.preHourly+design.additionalHourRequested,
            preAmount:oldValue.preAmount,
            designer: oldValue.designer,
            placedAt: oldValue.placedAt,
          designerPayment=design.additionalHourRequested*design.order.preAmount
          businessGain=designerPayment*settings.payment.threeDoersDesigner
          taxes=businessGain*settings.payment.taxes
          businessPayment=designerPayment+businessGain+taxes

          design.designerPayment+=designerPayment
          design.businessGain+=businessGain
          design.taxes+=taxes
          design.businessPayment+=businessPayment
          paypalSdk = new Paypal
            userId: settings.paypal.adaptive.user
            password:  settings.paypal.adaptive.password,
            signature: settings.paypal.adaptive.signature,
            appId: settings.paypal.adaptive.appId,
            sandbox:   settings.paypal.adaptive.debug

          auth.User.findOne({_id: design.designer}).exec().then( (user) ->
            if user
              payload =
                requestEnvelope:
                  errorLanguage:  'en_US'
                actionType:     'PAY_PRIMARY'
                payKeyDuration: 'P29D'
                currencyCode:   'EUR'
                feesPayer:      'EACHRECEIVER',
                memo:           'Payment for 3D printing in 3doers'
                returnUrl:      "#{settings.site}/design/project/timeExpired/pay/execute/#{design.id}"
                cancelUrl:      "#{settings.site}/design/project/timeExpired/pay/cancel/#{design.id}"
                receiverList:
                  receiver: [
                    {
                      email:  '3doers@gmail.com',
                      amount: businessPayment,  # total price
                      primary: 'true'
                    },
                    {
                      email:  user.email,
                      amount: designerPayment,
                      primary: 'false'
                    }
                  ]
              paypalSdk.pay payload, (err, response) ->
                if err
                  console.log response.error
                  logger.error err
                  res.send 500
                else
                  design.timeExpiredPayKey=response.payKey
                  design.secundaryExpiredPaid=false
                  design.save()
                  user.onTime=true
                  user.save()
                  res.redirect response.paymentApprovalUrl
            )
        else
          stringerror = encodeURIComponent("value not allowed")
          return res.redirect('design/project/'+req.params.id+'?error='+stringerror)
      else
        res.send 404
    ).fail( (error) ->
      logger.error error
      res.send 500
    )

  app.post '/design/stl/needMoreTime/:id', decorators.loginRequired, (req, res) ->
    extraTimeValue=[1,3,5]
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (design) ->
      if design
          moreTime=parseInt(req.body.moreTime)
          if (extraTimeValue.indexOf(moreTime)>=0)
            design.additionalHourRequested=moreTime
            design.status=models.DESIGN_STATUSES.TIMEREQUIRECONFIRM[0]
            design.save()
            auth.User.findOne({_id:design.designer}).exec().then((user) ->
              user.numberOfDelay+=1
              user.save()
              return res.redirect 'design/project/'+design.id
            ).fail( ->
              logger.error arguments
              res.send 500
            )

          else
            stringerror = encodeURIComponent("value not allowed")
            return res.redirect('design/project/'+req.params.id+'?error='+stringerror)
      else
        res.send 404
    ).fail( (error) ->
      logger.error error
      res.send 500

    )

  app. post '/design/project/pay/:id' ,decorators.loginRequired, (req,res) ->
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (design) ->
      if design
        design.designerPayment=Math.round(design.order.preHourly*design.order.preAmount) / 100
        design.businessGain=Math.round(design.designerPayment*settings.payment.threeDoersDesigner) / 100

        design.taxes=Math.round(design.businessGain*settings.payment.taxes) / 100

        design.businessPayment=design.designerPayment+design.businessGain+design.taxes
        console.log design.businessPayment
        console.log 'compute'
        paypalSdk = new Paypal
          userId: settings.paypal.adaptive.user
          password:  settings.paypal.adaptive.password,
          signature: settings.paypal.adaptive.signature,
          appId: settings.paypal.adaptive.appId,
          sandbox:   settings.paypal.adaptive.debug

        auth.User.findOne({_id: design.designer}).exec().then (user) ->
            if user
              payload =
                requestEnvelope:
                  errorLanguage:  'en_US'
                actionType:     'PAY_PRIMARY'
                payKeyDuration: 'P29D'
                currencyCode:   'EUR'
                feesPayer:      'EACHRECEIVER',
                memo:           'Payment for 3D printing in 3doers'
                returnUrl:      "#{settings.site}/design/project/pay/execute/#{design.id}"
                cancelUrl:      "#{settings.site}/design/project/pay/cancel/#{design.id}"
                receiverList:
                  receiver: [
                    {
                      email:  '3doers@gmail.com',
                      amount: design.businessPayment,  # total price
                      primary: 'true'
                    },
                    {
                      email:  user.email,
                      amount: design.designerPayment,
                      primary: 'false'
                    }
                  ]
              console.log 'pay'
              paypalSdk.pay payload, (err, response) ->
                if err
                  console.log response.error
                  logger.error err
                  res.send 500
                else
                  design.payKey=response.payKey
                  design.secundaryPaid=false

                  design.save()
                  res.redirect response.paymentApprovalUrl
      else
        res.send 404
    ).fail( (error) ->
      console.log error
      logger.error error
      res.send 500
    )
  app.get '/design/project/timeExpired/pay/execute/:id', decorators.loginRequired, (req, res) ->
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc
        auth.User.findOne(doc.designer).exec().then((user) ->
          doc.status=models.DESIGN_STATUSES.TIMEEXPIREDPROCESSED[0]
          doc.save()
          res.redirect "/design/project/#{doc.id}"
          res.redirect "/design/project/#{doc.id}"
        )).fail( (error) ->
      console.log error
      logger.error error
      res.send 500
    )
  app.get '/design/project/timeExpired/pay/cancel/:id', decorators.loginRequired, (req, res) ->
    res.redirect "design/project/#{req.params.id}"
  app.get '/design/project/pay/cancel/:id', decorators.loginRequired, (req, res) ->
      res.redirect "design/project/#{req.params.id}"

  app.get '/design/project/pay/execute/:id', decorators.loginRequired, (req, res) ->
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (doc) ->
      if doc
        auth.User.findOne(doc.designer).exec().then((user) ->
          doc.status=models.DESIGN_STATUSES.PAID[0]
          console.log doc
          doc.save()
          mailer.send('mailer/design/payed', {project: doc, user: user, site:settings.site}, {from: settings.mailer.noReply, to:[user.email], subject: settings.project.payed.subject})
          res.redirect "/design/project/#{req.params.id}"
        )
    ).fail( (error) ->
      console.log error
      logger.error error
      res.send 500
    )

  app. post '/design/project/rate/:id' ,decorators.loginRequired, (req,res) ->
    models.STLDesign.findOne({_id: req.params.id}).exec().then( (design) ->
      if design
        try
          rate=parseFloat(req.body.rate)
        catch e
          stringerror=e.toString()
          return res.redirect('design/project/'+req.params.id+'?error='+stringerror)
        if (rate<0||rate>5)
          stringerror = encodeURIComponent("value not allowed")
          return res.redirect('design/project/'+req.params.id+'?error='+stringerror)
        design.rate=rate
        design.status=models.DESIGN_STATUSES.ARCHIVED[0]
        design.save()
        userModel.findOne({_id:design.designer}).exec().then( (user) ->
          if user
            models.STLDesign.find({designer: user.id,status:{"$gte": models.DESIGN_STATUSES.DELIVERED[0]}}).exec().then( (designsWork) ->
              if designsWork
                 TotalRate=0
                 console.log 'before' + TotalRate
                 for work in designsWork
                   console.log work.rate
                   TotalRate+=work.rate
                 console.log 'after' +TotalRate
                 console.log designsWork.length
                 user.rate=TotalRate/designsWork.length
                 user.save()
                 res.redirect 'design/project/'+req.params.id
            ).fail( ->
              logger.error arguments
              res.send 500
            )
          else
            res.send 500
        ).fail( ->
          logger.error arguments
          res.send 500
        )

      else
        res.send 404
    ).fail( (error) ->
      logger.error error
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
        res.redirect "design/projects"

