(function() {
  module.exports = function(app, io) {
    var Paypal, auth, decorators, fs, logger, mailer, models, settings;
    fs = require('fs');
    models = require('./models');
    decorators = require('../decorators');
    logger = require('../logger');
    mailer = require('../mailer').mailer;
    settings = require('../../config');
    auth = require('../auth/models');
    Paypal = require('paypal-adaptive');
    app.get('/filemanager/projects', decorators.loginRequired, function(req, res) {
      return models.FileProject.find({
        user: req.user._id,
        status: {
          "$ne": models.PROJECT_STATUSES.FINISHED[0]
        }
      }).exec().then(function(docs) {
        return res.render('filemanager/project/list_projects', {
          projects: docs
        });
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/filemanager/upload', decorators.loginRequired, function(req, res) {
      var project, tmp_path;
      if (req.files.thumbnail.size === 0) {
        res.json({
          errors: {
            image: "This field is required"
          }
        });
        return;
      }
      if (req.files.thumbnail.type !== 'application/octet-stream' || req.files.thumbnail.path.split('/').pop().split('.').pop().toLowerCase() !== 'stl') {
        res.json({
          errors: {
            thumbnail: {
              msg: "Is not a valid format, you need to upload a STL file."
            }
          }
        });
        fs.unlink(req.files.thumbnail.path);
        return;
      }
      tmp_path = req.files.thumbnail.path;
      project = new models.FileProject;
      project.user = req.user.id;
      project.title = req.files.thumbnail.name;
      project.original_file = req.files.thumbnail.path.split('/').pop();
      return project.save(function(err, doc) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.json({
            redirectTo: "/filemanager/project/" + project.id
          });
        }
      });
    });
    app.post('/filemanager/upload-review/:id', decorators.loginRequired, function(req, res) {
      if (req.files.thumbnail.size === 0) {
        res.json({
          errors: {
            image: "This field is required"
          }
        });
        return;
      }
      if (req.files.thumbnail.type !== 'application/octet-stream' || req.files.thumbnail.path.split('/').pop().split('.').pop().toLowerCase() !== 'stl') {
        res.json({
          errors: {
            thumbnail: {
              msg: "Is not a valid format, you need to upload a STL file."
            }
          }
        });
        fs.unlink(req.files.thumbnail.path);
        return;
      }
      return models.FileProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        var tmp_path;
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.FINISHED[0])) {
          tmp_path = req.files.thumbnail.path;
          doc.reviewed_file = req.files.thumbnail.path.split('/').pop();
          doc.status = models.PROJECT_STATUSES.FINISHED[0];
          return doc.save(function(err, doc) {
            if (err) {
              logger.error(err);
              return res.send(500);
            } else {
              return auth.User.findOne(doc.user).exec(function(err, user) {
                if (user & user.mailNotification) {
                  mailer.send('mailer/filemanager/finished', {
                    project: doc,
                    user: user,
                    site: settings.site
                  }, {
                    from: settings.mailer.noReply,
                    to: [user.email],
                    subject: settings.filemanager.accept.subject
                  }).then(function() {});
                }
                return res.json({
                  msg: "Accepted",
                  redirectTo: "/filemanager/archived"
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
    app.get('/filemanager/requests', decorators.filemanagerRequired, function(req, res) {
      return models.FileProject.find({
        status: {
          "$lt": models.PROJECT_STATUSES.PREACCEPTED[0],
          "$gt": models.PROJECT_STATUSES.FINISHED[0]
        },
        'filemanager': req.user.id
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          if (docs && docs.length > 0) {
            return res.render('filemanager/requests', {
              projects: docs,
              toApply: false
            });
          } else {
            return models.FileProject.find({
              status: models.PROJECT_STATUSES.UPLOADED[0]
            }).exec(function(err, docs) {
              if (err) {
                logger.error(err);
                return res.send(500);
              } else {
                return res.render('filemanager/requests', {
                  projects: docs,
                  toApply: true
                });
              }
            });
          }
        }
      });
    });
    app.get('/filemanager/jobs', decorators.filemanagerRequired, function(req, res) {
      return models.FileProject.find({
        'filemanager': req.user.id,
        status: {
          "$lt": models.PROJECT_STATUSES.FINISHED[0],
          "$gt": models.PROJECT_STATUSES.UPLOADED[0]
        }
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.render('filemanager/jobs', {
            projects: docs
          });
        }
      });
    });
    app.get('/filemanager/archived', decorators.loginRequired, function(req, res) {
      return models.FileProject.find({
        filemanager: req.user._id,
        status: models.PROJECT_STATUSES.FINISHED[0]
      }).exec().then(function(docs) {
        return res.render('filemanager/archived', {
          projects: docs
        });
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/filemanager/profile/archived', decorators.loginRequired, function(req, res) {
      return models.FileProject.find({
        user: req.user._id,
        status: models.PROJECT_STATUSES.FINISHED[0]
      }).exec().then(function(docs) {
        return res.render('filemanager/project/list_projects', {
          projects: docs
        });
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/filemanager/pre-accept/:id', decorators.filemanagerRequired, function(req, res) {
      return models.FileProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PREACCEPTED[0])) {
          return auth.User.findOne(doc.user).exec(function(err, user) {
            if (user & user.mailNotification) {
              mailer.send('mailer/filemanager/accept', {
                project: doc,
                user: user,
                site: settings.site
              }, {
                from: settings.mailer.noReply,
                to: [user.email],
                subject: settings.filemanager.accept.subject
              });
            }
            doc.status = models.PROJECT_STATUSES.PREACCEPTED[0];
            doc.filemanager = req.user.id;
            doc.save();
            return res.json({
              msg: "Accepted"
            });
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
    app.get('/filemanager/project/:id', decorators.loginRequired, function(req, res, next) {
      return models.FileProject.findOne({
        _id: req.params.id,
        $or: [
          {
            user: req.user.id
          }, {
            filemanager: req.user.id
          }
        ]
      }).exec().then(function(doc) {
        if (doc) {
          return res.render('filemanager/project/detail', {
            statuses: models.PROJECT_STATUSES,
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
    app.post('/filemanager/project/comment/:id', decorators.loginRequired, function(req, res, next) {
      return models.FileProject.findOne({
        _id: req.params.id,
        $or: [
          {
            user: req.user.id
          }, {
            'filemanager': req.user.id
          }
        ]
      }).exec().then(function(doc) {
        var comment;
        if (doc && doc.status >= models.PROJECT_STATUSES.PREACCEPTED[0]) {
          if (req.body.message) {
            comment = {
              author: req.user.id,
              username: req.user.username,
              photo: req.user.photo,
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
    app.post('/filemanager/project/title/:id', decorators.loginRequired, function(req, res) {
      var errors;
      req.assert('value').len(4);
      errors = req.validationErrors(true);
      if (errors) {
        return res.send(errors.value.msg, 400);
      } else {
        return models.FileProject.findOne({
          _id: req.params.id
        }).exec().then(function(doc) {
          if (doc) {
            doc.title = req.body.value;
            doc.save();
            return res.send(req.body.value, 200);
          } else {
            return res.send(404);
          }
        }).fail(function() {
          logger.error(arguments);
          return res.send(500);
        });
      }
    });
    app.post('/filemanager/project/description/:id', decorators.loginRequired, function(req, res) {
      var errors;
      req.assert('value').len(4);
      errors = req.validationErrors(true);
      if (errors) {
        return res.send(errors.value.msg, 400);
      } else {
        return models.FileProject.findOne({
          _id: req.params.id
        }).exec().then(function(doc) {
          if (doc) {
            doc.description = req.body.value;
            doc.save();
            return res.send(req.body.value, 200);
          } else {
            return res.send(404);
          }
        }).fail(function() {
          logger.error(arguments);
          return res.send(500);
        });
      }
    });
    app.post('/filemanager/accept/:id', decorators.filemanagerRequired, function(req, res) {
      return models.FileProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.ACCEPTED[0])) {
          return auth.User.findOne(doc.user).exec(function(err, user) {
            if (user & user.mailNotification) {
              mailer.send('mailer/filemanager/accept', {
                project: doc,
                user: user,
                site: settings.site
              }, {
                from: settings.mailer.noReply,
                to: [user.email],
                subject: settings.filemanager.accept.subject
              });
            }
            doc.status = models.PROJECT_STATUSES.ACCEPTED[0];
            doc.save();
            return res.json({
              msg: "Accepted"
            });
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
    app.post('/filemanager/deny/:id', decorators.filemanagerRequired, function(req, res) {
      return models.FileProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        logger.debug(doc.validateNextStatus(models.PROJECT_STATUSES.UPLOADED[0]));
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.UPLOADED[0])) {
          doc.status = models.PROJECT_STATUSES.UPLOADED[0];
          doc.save();
          res.json({
            msg: "Denied"
          });
        }
        if (doc && doc.status === models.PROJECT_STATUSES.ACCEPTED[0]) {
          return res.json({
            msg: "Looks like someone accepted, try with another"
          }, 400);
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/filemanager/project/pay/:id', decorators.loginRequired, function(req, res, next) {
      return models.FileProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        var paypalSdk, totalPrice;
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PAID[0])) {
          totalPrice = parseFloat(doc.price);
          paypalSdk = new Paypal({
            userId: settings.paypal.adaptive.user,
            password: settings.paypal.adaptive.password,
            signature: settings.paypal.adaptive.signature,
            appId: settings.paypal.adaptive.appId,
            sandbox: settings.paypal.adaptive.debug
          });
          return auth.User.findOne({
            _id: doc.filemanager
          }).exec().then(function(user) {
            var payload;
            if (user) {
              payload = {
                requestEnvelope: {
                  errorLanguage: 'en_US'
                },
                actionType: 'PAY',
                currencyCode: 'EUR',
                feesPayer: 'EACHRECEIVER',
                memo: 'Payment for 3D filemanager in 3doers',
                cancelUrl: "" + settings.site + "/filemanager/project/pay/cancel/" + doc.id,
                returnUrl: "" + settings.site + "/filemanager/project/pay/execute/" + doc.id,
                receiverList: {
                  receiver: [
                    {
                      email: '3doers@gmail.com',
                      amount: '2.5',
                      primary: 'false'
                    }, {
                      email: user.email,
                      amount: '7.5',
                      primary: 'false'
                    }
                  ]
                }
              };
              return paypalSdk.pay(payload, function(err, response) {
                if (err) {
                  logger.error(err);
                  return res.send(500);
                } else {
                  return res.redirect(response.paymentApprovalUrl);
                }
              });
            }
          });
        } else {
          return res.send(400);
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/filemanager/project/pay/cancel/:id', decorators.loginRequired, function(req, res) {
      delete req.session.paymentFilemanagerId;
      return res.redirect("/filemanager/project/" + req.params.id);
    });
    return app.get('/filemanager/project/pay/execute/:id', decorators.loginRequired, function(req, res) {
      return models.FileProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PAID[0])) {
          return auth.User.findOne(doc.filemanager).exec(function(err, user) {
            var updatedData;
            updatedData = {
              status: models.PROJECT_STATUSES.PAID[0]
            };
            return doc.update(updatedData, function(error) {
              if (!error) {
                mailer.send('mailer/filemanager/payed', {
                  project: doc,
                  user: user,
                  site: settings.site
                }, {
                  from: settings.mailer.noReply,
                  to: [user.email],
                  subject: settings.project.payed.subject
                });
              }
              return res.redirect("/filemanager/project/" + req.params.id);
            });
          });
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
  };

}).call(this);
