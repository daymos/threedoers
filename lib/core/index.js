(function() {
  module.exports = function(app, io) {
    var STLStats, auth, calculateOrderPrice, decimal, decorators, exec, fs, gridfs, logger, mailer, models, paypal, processVolumeWeight, settings, utils;
    fs = require('fs');
    exec = require('child_process').exec;
    decimal = require('Deci-mal').decimal;
    paypal = require('paypal-rest-sdk');
    decorators = require('../decorators');
    logger = require('../logger');
    mailer = require('../mailer').mailer;
    settings = require('../../config');
    STLStats = require('../stlstat').STLStats;
    gridfs = require('../gridfs');
    models = require('./models');
    utils = require('../utils');
    auth = require('../auth/models');
    paypal.configure(settings.paypal.api);
    app.get('/', function(req, res) {
      return res.render('core/index', {
        message: null
      });
    });
    app.post('/', function(req, res) {
      var errors;
      req.assert('email').isEmail();
      errors = req.validationErrors(true);
      if (errors) {
        return res.render('core/index', {
          message: errors.email.msg,
          email: req.body.email
        });
      } else {
        return models.Subscription.find({
          email: req.body.email
        }).exec().then(function(emails) {
          var s;
          if (emails.length > 0) {
            return res.render('core/index', {
              message: "Already subscribed",
              email: req.body.email
            });
          } else {
            s = new models.Subscription();
            s.email = req.body.email;
            s.save();
            return res.render('core/index', {
              message: "Thank you for subscribing",
              email: req.body.email
            });
          }
        });
      }
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
      project.title = req.files.thumbnail.name;
      project.file = req.files.thumbnail.path.split('/').pop();
      return project.save(function(err, doc) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.send({
            redirectTo: "/project/" + project.id
          });
        }
      });
    });
    app.get('/project/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        $or: [
          {
            user: req.user.id
          }, {
            'order.printer': req.user.id
          }
        ]
      }).exec().then(function(doc) {
        if (doc) {
          if (!(doc.volume && !doc.bad)) {
            processVolumeWeight(doc);
          }
          return res.render('core/project/detail', {
            project: doc,
            colors: models.PROJECT_COLORS,
            densities: models.PROJECT_DENSITIES,
            statuses: models.PROJECT_STATUSES
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
          _id: req.params.id
        }).exec().then(function(doc) {
          if (doc) {
            if (doc.editable) {
              doc.title = req.body.value;
              doc.save();
              return res.send(200);
            } else {
              return res.send("Project couldn't be editable at this status.", 400);
            }
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
            delete cloned.comments;
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
    app.post('/project/order/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        editable: true
      }).exec().then(function(doc) {
        var ammount;
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REQUESTED[0])) {
          ammount = Math.abs(req.body.ammount && parseInt(req.body.ammount) ? parseInt(req.body.ammount) : 1);
          doc.status = models.PROJECT_STATUSES.PRINT_REQUESTED[0];
          doc.order = {
            ammount: ammount,
            price: calculateOrderPrice(doc.price, ammount).toString()
          };
          doc.save();
        }
        return res.redirect("/project/" + req.params.id);
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/project/comment/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        $or: [
          {
            user: req.user.id
          }, {
            'order.printer': req.user.id
          }
        ]
      }).exec().then(function(doc) {
        var comment;
        if (doc && doc.status >= models.PROJECT_STATUSES.PRINT_ACCEPTED[0]) {
          if (req.body.message) {
            comment = {
              author: req.user.id,
              username: req.user.username,
              content: req.body.message,
              createdAt: Date.now()
            };
            doc.comments.push(comment);
            doc.save();
            return res.json(comment, 200);
          } else {
            return res.json({
              msg: "The message is required."
            }, 400);
          }
        } else {
          return res.json({
            msg: "Not allowed comments at this moment."
          }, 400);
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/project/pay/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        var payment;
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])) {
          payment = {
            intent: "sale",
            payer: {
              payment_method: "paypal"
            },
            redirect_urls: {
              return_url: "" + settings.site + "/project/pay/execute/" + doc.id,
              cancel_url: "" + settings.site + "/project/pay/cancel/" + doc.id
            },
            transactions: [
              {
                amount: {
                  total: doc.order.price,
                  currency: "USD"
                },
                description: "Payment for 3D printing in 3doers"
              }
            ]
          };
          return paypal.payment.create(payment, function(error, payment) {
            var i, link, redirectUrl;
            if (error) {
              logger.error(error);
              return res.send(500);
            } else {
              if (payment.payer.payment_method === "paypal") {
                req.session.paymentId = payment.id;
                redirectUrl = void 0;
                i = 0;
                while (i < payment.links.length) {
                  link = payment.links[i];
                  if (link.method === "REDIRECT") {
                    redirectUrl = link.href;
                  }
                  i++;
                }
                return res.redirect(redirectUrl);
              }
            }
          });
        } else {
          return res.redirect("/project/" + req.params.id);
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/project/pay/cancel/:id', decorators.loginRequired, function(req, res) {
      delete req.session.paymentId;
      return res.redirect("/project/" + req.params.id);
    });
    app.get('/project/pay/execute/:id', decorators.loginRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])) {
          auth.User.findOne(doc.order.printer).exec(function(err, user) {
            var details, payerId, paymentId;
            paymentId = req.session.paymentId;
            payerId = req.param("PayerID");
            details = {
              payer_id: payerId
            };
            return paypal.payment.execute(paymentId, details, function(error, payment) {
              if (error) {
                return logger.error(error);
              } else {
                return mailer.send('mailer/project/payed', {
                  project: doc,
                  user: user,
                  site: settings.site
                }, {
                  from: settings.mailer.noReply,
                  to: [user.email],
                  subject: settings.project.payed.subject
                }).then(function() {
                  doc.status = models.PROJECT_STATUSES.PAYED[0];
                  return doc.save();
                });
              }
            });
          });
        }
        return res.redirect("/project/" + req.params.id);
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/project/start-printing/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        'order.printer': req.user.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINTING[0])) {
          doc.status = models.PROJECT_STATUSES.PRINTING[0];
          doc.save();
        }
        return res.redirect("/project/" + req.params.id);
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/project/printed/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        'order.printer': req.user.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINTED[0])) {
          doc.status = models.PROJECT_STATUSES.PRINTED[0];
          doc.save();
        }
        return res.redirect("/project/" + req.params.id);
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/printing/requests', decorators.printerRequired, function(req, res) {
      return models.STLProject.find({
        status: models.PROJECT_STATUSES.PRINT_REQUESTED[0]
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.render('core/printing/requests', {
            projects: docs
          });
        }
      });
    });
    app.get('/printing/jobs', decorators.printerRequired, function(req, res) {
      return models.STLProject.find({
        'order.printer': req.user.id
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.render('core/printing/jobs', {
            projects: docs
          });
        }
      });
    });
    app.post('/printing/accept/:id', decorators.printerRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id,
        editable: false
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_ACCEPTED[0])) {
          return auth.User.findOne(doc.user).exec(function(err, user) {
            if (user) {
              return mailer.send('mailer/printing/accept', {
                project: doc,
                user: user,
                site: settings.site
              }, {
                from: settings.mailer.noReply,
                to: [user.email],
                subject: settings.printing.accept.subject
              }).then(function() {
                doc.status = models.PROJECT_STATUSES.PRINT_ACCEPTED[0];
                doc.order = {
                  printer: req.user.id,
                  ammount: doc.order.ammount,
                  price: doc.order.price
                };
                doc.save();
                return res.json({
                  msg: "Accepted"
                });
              });
            }
          });
        } else {
          return res.json({
            msg: "Looks like someone accepted, try with another"
          }, 400);
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
        }, {
          title: 1,
          volume: 1,
          status: 1,
          editable: 1
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
