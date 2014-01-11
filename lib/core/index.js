(function() {
  module.exports = function(app, io) {
    var STLStats, decorators, exec, fs, gridfs, logger, mailer, models, settings, utils;
    fs = require('fs');
    exec = require('child_process').exec;
    decorators = require('../decorators');
    logger = require('../logger');
    mailer = require('../mailer').mailer;
    settings = require('../../config');
    STLStats = require('../stlstat').STLStats;
    gridfs = require('../gridfs');
    models = require('./models');
    utils = require('../utils');
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
      var project, tmp_path;
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
      project.user = req.user.id;
      project.file = req.files.thumbnail.path.split('/').pop();
      project.save(function(err, doc) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.send({
            redirectTo: "/project/" + project.id
          });
        }
      });
      return exec("" + settings.python.bin + " " + settings.python.path + " " + req.files.thumbnail.path + " -d " + project.density, function(err, stdout, stderr) {
        var cloned, e, result;
        if (!err && !stderr) {
          try {
            result = JSON.parse(stdout);
            project.volume = result.volume;
            project.weight = result.weight;
            project.unit = result.unit;
            project.status = models.PROJECT_STATUSES.PROCESSED[0];
            project.save();
            cloned = utils.cloneObject(project._doc);
            cloned.status = project.humanizedStatus();
            return io.sockets["in"](project._id.toHexString()).emit('update', cloned);
          } catch (_error) {
            e = _error;
            logger.error(e);
            logger.error(stderr);
            project.bad = true;
            return project.save();
          }
        } else {
          project.bad = true;
          return project.save();
        }
      });
    });
    app.get('/project/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        if (doc) {
          if (doc.bad) {
            exec("" + settings.python.bin + " " + settings.python.path + " " + settings.upload.to + doc.file + " -d " + doc.density, function(err, stdout, stderr) {
              var cloned, e, result;
              if (!err && !stderr) {
                try {
                  result = JSON.parse(stdout);
                  doc.volume = result.volume;
                  doc.weight = result.weight;
                  doc.unit = result.unit;
                  doc.status = models.PROJECT_STATUSES.PROCESSED[0];
                  doc.bad = false;
                  doc.save();
                  cloned = utils.cloneObject(doc._doc);
                  cloned.status = doc.humanizedStatus();
                  return io.sockets["in"](doc._id.toHexString()).emit('update', cloned);
                } catch (_error) {
                  e = _error;
                  logger.error(e);
                  return logger.error(stderr);
                }
              }
            });
          }
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
    return io.of('/project').on('connection', function(socket) {
      if (socket.handshake.query.project != null) {
        return models.STLProject.findOne({
          _id: socket.handshake.query.project,
          user: socket.handshake.session.passport.user
        }).exec().then(function(doc) {
          if (doc) {
            socket.join(socket.handshake.query.project);
            doc._doc.status = doc.humanizedStatus();
            return socket.emit('update', doc._doc);
          } else {
            return socket.emit('error', {
              msg: "Document not found"
            });
          }
        }).fail(function(reason) {
          logger.error(reason);
          return socket.emit('error', {
            msg: "Error searching for project. Mongo Error"
          });
        });
      } else {
        return socket.emit('error', {
          msg: "No project was not sent"
        });
      }
    });
  };

}).call(this);
