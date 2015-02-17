(function() {
  module.exports = function(app) {
    var auth, decorators, logger, models, settings;
    auth = require('../auth/models');
    logger = require('../logger');
    decorators = require('../decorators');
    models = require('./models');
    settings = require('../../config');
    app.get('/design/stl', decorators.loginRequired, function(req, res) {
      return res.render('design/ask/stl', {
        error: ""
      });
    });
    app.get('/design/requests', decorators.loginRequired, function(req, res) {
      return models.STLDesign.find().exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.render('design/requests', {
            projects: docs,
            toApply: true
          });
          /*else
            models.FileProject.find(status: models.PROJECT_STATUSES.UPLOADED[0]).exec (err, docs) ->
              if err
                logger.error err
                res.send 500
              else
                res.render 'filemanager/requests', {projects: docs, toApply:true}
          */

        }
      });
    });
    return app.post('/design/stl/upload', decorators.loginRequired, function(req, res) {
      var design, files, i, resources;
      files = [].concat(req.files.file);
      resources = [];
      if (files[0].length > 4) {
        return res.render('design/ask/stl', {
          error: "Too files"
        });
      } else {
        i = 0;
        while (i < files[0].length) {
          resources.push(files[0][i].path.replace(/^.*[\\\/]/, ''));
          i++;
        }
        console.log(resources.length);
        design = new models.STLDesign;
        design.resources = resources;
        design.creator = req.user.id;
        design.title = req.body.title;
        design.abstract = req.body.abstract;
        design.description = req.body.stl_desc;
        return design.save(function(err) {
          if (err) {
            logger.error(reason);
            return res.send(500);
          } else {
            return res.redirect("/home");
          }
        });
      }
    });
  };

}).call(this);
