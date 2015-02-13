module.exports = (app) ->

  auth = require '../auth/models'
  logger = require '../logger'
  decorators = require '../decorators'
  models = require('./models')

  app.get '/design/stl', decorators.loginRequired, (req, res) ->
      res.render 'design/ask/stl',{error:""}


  app.get 'design/requests', decorators.loginRequired, (req, res) ->
      res.render 'design/requests'

  app.post '/design/stl/upload', decorators.loginRequired, (req, res) ->

    files = [].concat(req.files.file);
    resources = []

    if files[0].length>4
      res.render 'design/ask/stl', {error: "Too files"}
    else
      i = 0;
      while i<files[0].length
        resources.push files[0][i].path
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
