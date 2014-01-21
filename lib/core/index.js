(function() {
  module.exports = function(app, io) {
    var STLStats, auth, calculateOrderPrice, decimal, decorators, exec, fs, gridfs, logger, mailer, models, processVolumeWeight, settings, utils;
    fs = require('fs');
    exec = require('child_process').exec;
    decimal = require('Deci-mal').decimal;
    decorators = require('../decorators');
    logger = require('../logger');
    mailer = require('../mailer').mailer;
    settings = require('../../config');
    STLStats = require('../stlstat').STLStats;
    gridfs = require('../gridfs');
    models = require('./models');
    utils = require('../utils');
    auth = require('../auth/models');
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
      return processVolumeWeight(project);
    });
    app.get('/project/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        if (doc) {
          if (doc.bad) {
            processVolumeWeight(doc);
          }
          return res.render('core/project/detail', {
            project: doc,
            colors: models.PROJECT_COLORS,
            densities: models.PROJECT_DENSITIES
          });
        } else {
          return next();
        }
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      });
    });
    app.get('/profile/projects', decorators.loginRequired, function(req, res) {
      return models.STLProject.find({
        user: req.user._id
      }).exec().then(function(docs) {
        return res.render('core/profile/list_projects', {
          projects: docs
        });
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/profile/archived', decorators.loginRequired, function(req, res) {
      return models.STLProject.find({
        user: req.user._id,
        status: models.PROJECT_STATUSES.ARCHIVED[0]
      }).exec().then(function(docs) {
        return res.render('core/profile/list_projects', {
          projects: docs
        });
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/profile/settings', decorators.loginRequired, function(req, res) {
      return res.render('core/profile/settings', {
        errors: {}
      });
    });
    app.post('/profile/settings', decorators.loginRequired, function(req, res) {
      if (req.body.city && req.body.country && req.body.location) {
        req.user.city = req.body.city;
        req.user.country = req.body.country;
        req.user.location = req.body.location;
      }
      req.user.firstName = req.body.firstName;
      req.user.lastName = req.body.lastName;
      req.user.save();
      return res.render('core/profile/settings');
    });
    app.post('/project/title/:id', decorators.loginRequired, function(req, res) {
      var errors;
      req.assert('value').len(4);
      errors = req.validationErrors(true);
      if (errors) {
        return res.send(errors.value.msg, 400);
      } else {
        return models.STLProject.findOne({
          _id: req.params.id,
          editable: true
        }).exec().then(function(doc) {
          if (doc) {
            doc.title = req.body.value;
            doc.save();
            return res.send(200);
          } else {
            return res.send(404);
          }
        }).fail(function() {
          logger.error(arguments);
          return res.send(500);
        });
      }
    });
    app.post('/project/color/:id', decorators.loginRequired, function(req, res) {
      var errors;
      req.assert('value').regex(/red|green|blue|black|white|yellow/);
      errors = req.validationErrors(true);
      if (errors) {
        return res.send(errors.value.msg, 400);
      } else {
        return models.STLProject.findOne({
          _id: req.params.id,
          editable: true
        }).exec().then(function(doc) {
          if (doc) {
            doc.color = req.body.value;
            doc.save();
            return res.send(200);
          } else {
            return res.send(404);
          }
        }).fail(function() {
          logger.error(arguments);
          return res.send(500);
        });
      }
    });
    app.post('/project/density/:id', decorators.loginRequired, function(req, res) {
      var value;
      value = parseFloat(req.body.value);
      if (value !== models.PROJECT_DENSITIES.LOW[0] && value !== models.PROJECT_DENSITIES.MEDIUM[0] && value !== models.PROJECT_DENSITIES.HIGH[0] && value !== models.PROJECT_DENSITIES.COMPLETE[0]) {
        return res.send(400);
      } else {
        return models.STLProject.findOne({
          _id: req.params.id,
          editable: true
        }).exec().then(function(doc) {
          var cloned;
          if (doc) {
            doc.density = value;
            doc.status = models.PROJECT_STATUSES.PROCESSING[0];
            cloned = utils.cloneObject(doc._doc);
            cloned.status = doc.humanizedStatus();
            io.of('/project')["in"](doc._id.toHexString()).emit('update', cloned);
            processVolumeWeight(doc);
            return res.send(200);
          } else {
            return res.send(404);
          }
        }).fail(function() {
          logger.error(arguments);
          return res.send(500);
        });
      }
    });
    app.post('/project/generate/order/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        editable: true
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REQUESTED[0])) {
          res.render('core/project/order', {
            project: doc
          });
          return doc.status = models.PROJECT_STATUSES.PRINT_REQUESTED[0];
        } else {
          return next();
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    io.of('/project').on('connection', function(socket) {
      if (socket.handshake.query.project != null) {
        return models.STLProject.findOne({
          _id: socket.handshake.query.project,
          user: socket.handshake.session.passport.user
        }).exec().then(function(doc) {
          if (doc) {
            socket.join(doc._id.toHexString());
            doc._doc.status = doc.humanizedStatus();
            io.of('/project')["in"](doc._id.toHexString()).emit('update', doc._doc);
            return socket.on('order-price', function(data) {
              return models.STLProject.findOne(doc._id).exec().then(function(doc) {
                var ammount, price;
                ammount = Math.abs(data.ammount && parseInt(data.ammount) ? parseInt(data.ammount) : 1);
                price = calculateOrderPrice(doc.price, ammount);
                return io.of('/project')["in"](doc._id.toHexString()).emit('update-price-order', {
                  price: price.toString()
                });
              });
            });
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
    processVolumeWeight = function(doc) {
      return exec("" + settings.python.bin + " " + settings.python.path + " " + settings.upload.to + doc.file + " -d " + doc.density, function(err, stdout, stderr) {
        var cloned, e, result;
        if (!err && !stderr) {
          try {
            result = JSON.parse(stdout);
            doc.volume = result.volume;
            doc.weight = result.weight;
            doc.unit = result.unit;
            doc.status = models.PROJECT_STATUSES.PROCESSED[0];
            doc.price = decimal.fromNumber((doc.volume * 1.01 * doc.density * 0.03) + 5, 2);
            doc.bad = false;
            doc.save();
          } catch (_error) {
            e = _error;
            logger.error(e);
            logger.error(stderr);
            doc.bad = true;
            doc.save();
          }
        } else {
          doc.bad = true;
          doc.save();
        }
        cloned = utils.cloneObject(doc._doc);
        cloned.status = doc.humanizedStatus();
        return io.of('/project')["in"](doc._id.toHexString()).emit('update', cloned);
      });
    };
    return calculateOrderPrice = function(basePrice, ammount) {
      if (basePrice <= 10) {
        return decimal.fromNumber((3 + 2 * basePrice) * ammount, 2);
      } else {
        return decimal.fromNumber((23 + 10 * Math.log(basePrice - 9)) * ammount, 2);
      }
    };
  };

}).call(this);
