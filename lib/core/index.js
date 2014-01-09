(function() {
  module.exports = function(app) {
    var STLStats, decorators, exec, fs, gridfs, logger, mailer, models, settings;
    fs = require('fs');
    exec = require('child_process').exec;
    decorators = require('../decorators');
    logger = require('../logger');
    mailer = require('../mailer').mailer;
    settings = require('../../config');
    STLStats = require('../stlstat').STLStats;
    gridfs = require('../gridfs');
    models = require('./models');
    app.get('/', function(req, res) {
      return res.render('core/index');
    });
    app.get('/become', decorators.loginRequired, function(req, res) {
      return res.render('core/become');
    });
    app.post('/become', decorators.loginRequired, function(req, res) {
      if (req.user.printer) {
        return res.render('core/become');
      } else {
        mailer.send('mailer/core/become', {
          user: req.user
        }, {
          from: req.user.email,
          to: settings.admins.emails,
          subject: "New Become a Printer Request"
        }).then(function() {
          req.user.printer = 'request';
          return req.user.save();
        });
        return res.render('core/become_done');
      }
    });
    app.get('/project/upload', decorators.loginRequired, function(req, res) {
      return res.render('core/project/upload');
    });
    app.post('/project/upload', decorators.loginRequired, function(req, res) {
      var opts, project, tmp_path;
      if (req.files.thumbnail.size === 0) {
        res.render('core/project/upload', {
          errors: {
            thumbnail: {
              msg: "This field is required"
            }
          }
        });
        return;
      }
      tmp_path = req.files.thumbnail.path;
      project = new models.STLProject;
      opts = {
        content_type: req.files.thumbnail.type
      };
      return project.addFile(req.files.thumbnail, opts).then(function(doc) {
        exec("" + settings.python.bin + " " + settings.python.path + " " + project.file + " -d " + project.density, function(err, stdout, stderr) {
          var e, result;
          if (!err && !stderr) {
            try {
              result = JSON.parse(stdout);
              project.volume = result.volume;
              project.weight = result.weight;
              project.unit = result.unit;
              project.processed = true;
              project.save();
              return logger.info("Project " + project.id + " just processed.");
            } catch (_error) {
              e = _error;
              return logger.error(e);
            }
          }
        });
        project.user = req.user.id;
        return project.save(function(err, doc) {
          if (err) {
            logger.error(err);
            return res.send(500);
          } else {
            return res.redirect("/project/" + project.id);
          }
        });
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      })["finally"](function() {
        return fs.unlink(tmp_path);
      });
    });
    app.get('/project/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        if (doc) {
          return res.render('core/project/detail', {
            project: doc
          });
        } else {
          return next();
        }
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      });
    });
    return app.get('/project/files/:name', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        file: req.params.name,
        user: req.user.id
      }).exec().then(function(doc) {
        if (doc) {
          return gridfs.getFile(req.params.name).then(function(file) {
            res.header("Content-Type", file.type);
            res.header("Content-Length", file.length);
            res.header("Content-Disposition", "attachment; filename=" + file.filename);
            return file.stream(true).pipe(res);
          }).fail(function(reason) {
            logger.error(reason);
            return res.send(500);
          });
        } else {
          return next();
        }
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      });
    });
  };

}).call(this);
