(function() {
  module.exports = function(app) {
    var Paypal, Worksession, auth, decorators, fs, logger, mailer, models, settings, userModel, utils;
    fs = require('fs');
    auth = require('../auth/models');
    logger = require('../logger');
    decorators = require('../decorators');
    models = require('./models');
    Worksession = require('../api/models').WorkSession;
    userModel = require('../auth/models').User;
    settings = require('../../config');
    utils = require('../utils');
    mailer = require('../mailer').mailer;
    Paypal = require('paypal-adaptive');
    app.get('/design/stl', decorators.loginRequired, function(req, res) {
      var stringerror;
      stringerror = "";
      if (req.query.error) {
        stringerror = req.query.error;
      }
      return res.render('design/ask/stl', {
        error: stringerror
      });
    });
    app.get('/design/requests', decorators.filemanagerRequired, function(req, res) {
      return models.STLDesign.find({
        "$and": [
          {
            status: {
              "$lt": models.DESIGN_STATUSES.ACCEPTED[0]
            }
          }, {
            "proposal": {
              "$not": {
                "$elemMatch": {
                  "creator": req.user._id
                }
              }
            }
          }
        ]
      }).sort({
        createdAt: -1
      }).exec().then(function(docs) {
        if (docs) {
          return res.render('design/requests', {
            projects: docs,
            toApply: true,
            error: ""
          });
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/design/proposal/review/:id', decorators.loginRequired, function(req, res) {
      return models.Proposal.findOne({
        _id: req.params.id,
        accepted: false
      }).exec().then(function(prop) {
        if (prop) {
          prop.accepted = true;
          prop.save();
          console.log('prop save');
          return models.STLDesign.findOne({
            _id: prop.backref
          }).exec().then(function(stldes) {
            var i;
            stldes.proposalSelected = true;
            stldes.order = {
              preAmount: prop.cost,
              preHourly: prop.hour,
              designer: prop.creator,
              placedAt: new Date()
            };
            i = 0;
            while (i < stldes.proposal.length) {
              if (stldes.proposal[i]._id.toString() === prop._id.toString()) {
                stldes.proposal[i].accepted = prop.accepted;
                break;
              }
              i++;
            }
            return auth.User.findOne({
              _id: prop.creator
            }).exec().then(function(user) {
              user.designJobs += 1;
              user.save();
              stldes.designer = prop.creator;
              stldes.status = models.DESIGN_STATUSES.ACCEPTED[0];
              console.log('stl save');
              stldes.save();
              return res.redirect("design/project/" + stldes._id);
            });
          });
        } else {
          return res.send(404);
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/design/projects', decorators.loginRequired, function(req, res) {
      return models.STLDesign.find({
        'creator': req.user.id,
        status: {
          "$lt": models.DESIGN_STATUSES.ARCHIVED[0]
        }
      }).sort({
        createdAt: -1
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return auth.User.findOne({
            _id: req.user.id
          }).exec().then(function(user) {
            if (user) {
              if (user.printer === 'accepted') {
                return res.render('design/project/list_projects_for_printer', {
                  projects: docs
                });
              }
            }
            return res.render('design/project/list_projects', {
              projects: docs
            });
          }).fail(function() {
            logger.error(arguments);
            return res.send(500);
          });
        }
      });
    });
    app.get('/design/jobs', decorators.filemanagerRequired, function(req, res) {
      return models.STLDesign.find({
        $or: [
          {
            "proposal": {
              "$elemMatch": {
                "creator": req.user.id,
                "proposalSelected": false
              }
            }
          }, {
            $and: [
              {
                designer: req.user.id,
                status: {
                  "$lt": models.DESIGN_STATUSES.DELIVERED[0],
                  "$gte": models.DESIGN_STATUSES.UPLOADED[0]
                }
              }
            ]
          }
        ]
      }).sort({
        createdAt: -1
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.render('design/jobs', {
            projects: docs
          });
        }
      });
    });
    app.get('/design/archived', decorators.filemanagerRequired, function(req, res) {
      return models.STLDesign.find({
        designer: req.user.id,
        status: {
          "$gte": models.DESIGN_STATUSES.DELIVERED[0]
        }
      }).sort({
        createdAt: -1
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.render('design/archived', {
            projects: docs
          });
        }
      });
    });
    app.get('/design/detail/:id', decorators.loginRequired, function(req, res) {
      return console.log(req.params.id);
    });
    app.post('/design/proposal/:id', decorators.loginRequired, function(req, res) {
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        var computed, proposal;
        if (doc) {
          if (req.body.hours && req.body.cost) {
            proposal = new models.Proposal;
            proposal.creator = req.user.id;
            proposal.username = req.user.username;
            proposal.userRate = req.user.rate;
            computed = req.user.numberOfDelay / req.user.designJobs * 100;
            if (!isNaN(computed)) {
              proposal.timeRate = computed;
            }
            proposal.hour = req.body.hours;
            proposal.backref = req.params.id;
            proposal.cost = req.body.cost;
            proposal.createAt = Date.now();
            console.log(proposal, proposal.timeRate);
            console.log('before');
            proposal.save();
            console.log('after');
            console.log(proposal.timeRate);
            doc.proposal.push(proposal);
            console.log(doc);
            doc.save();
            console.log('save');
            return res.redirect("/profile/projects");
          } else {
            return res.redirect('/design/requests', {
              projects: doc,
              toApply: true,
              error: "You must fill both fields in ProposalForm"
            });
          }
        } else {
          return res.send("Project couldn't be editable at this status.", 400);
        }
      }).fail(function() {
        console.log('fail');
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/design/proposal', decorators.loginRequired, function(req, res) {
      return models.STLDesign.find({
        "creator": req.user.id,
        status: {
          "$lt": models.DESIGN_STATUSES.PREACCEPTED[0]
        }
      }).exec().then(function(doc) {
        if (doc) {
          return res.render('core/profile/proposal', {
            projects: doc,
            toApply: true,
            error: ""
          });
        } else {
          return res.render('core/profile/proposal', {
            projects: doc,
            toApply: true,
            error: "No Design Proposal for you"
          });
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/design/project/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLDesign.findOne({
        _id: req.params.id,
        $or: [
          {
            creator: req.user.id
          }, {
            $or: [
              {
                designer: req.user.id
              }, {
                designer: {
                  $exists: false
                }
              }, {
                "proposal": {
                  "$elemMatch": {
                    "creator": req.user.id
                  }
                }
              }
            ]
          }
        ]
      }).exec().then(function(doc) {
        if (doc) {
          return Worksession.find({
            "session_project_id": doc._id
          }).sort('session_date_stamp').exec().then(function(tmpList) {
            var designSessions, innerlist, session, _i, _len;
            designSessions = [];
            if (tmpList) {
              tmpList.shift();
            }
            innerlist = [];
            for (_i = 0, _len = tmpList.length; _i < _len; _i++) {
              session = tmpList[_i];
              if (session.session_screen_shot !== null) {
                innerlist.push(session);
              } else {
                if (innerlist.length) {
                  designSessions.push(innerlist);
                }
                innerlist = [];
              }
            }
            if (innerlist.length) {
              designSessions.push(innerlist);
            }
            if (doc.designer) {
              return userModel.findOne({
                _id: doc.designer
              }).exec().then(function(designer) {
                console.log(designer);
                return res.render('design/project/detail', {
                  statuses: models.DESIGN_STATUSES,
                  project: doc,
                  adminMail: settings.admins.emails,
                  designSessions: designSessions,
                  payment: settings.payment,
                  designer: designer
                });
              });
            } else {
              return res.render('design/project/detail', {
                statuses: models.DESIGN_STATUSES,
                project: doc,
                adminMail: settings.admins.emails,
                designSessions: designSessions,
                payment: settings.payment,
                designer: void 0
              });
            }
          }).fail(function(reason) {
            console.log(reason);
            logger.error(reason);
            return res.send(500);
          });
        } else {
          return res.redirect("/profile/projects");
        }
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      });
    });
    app.post('/design/deny/:id', decorators.filemanagerRequired, function(req, res) {
      console.log("/design/deny/:id");
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        var i;
        if (doc) {
          console.log("got a project");
          doc.status -= 1;
          doc.designer = "";
          i = 0;
          console.log("I have " + doc.proposal.length + " proposal for this project");
          while (i < doc.proposal.length) {
            if (doc.proposal[i].accepted) {
              console.log("proposal " + i + " was accepted and now rejected");
              doc.proposal[i].accepted = false;
              doc.proposal[i].rejected = true;
              break;
            } else {
              i++;
            }
          }
          models.Proposal.findOne({
            'backref': req.params.id
          }).exec().then(function(prop) {
            if (prop) {
              prop.accepted = false;
              prop.rejected = true;
              return prop.save();
            }
          }).fail(function() {
            logger.error(arguments);
            return res.send(500);
          });
          doc.save();
          return res.json({
            msg: "Denied"
          });
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/design/project/comment/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLDesign.findOne({
        _id: req.params.id,
        $or: [
          {
            creator: req.user.id
          }, {
            'designer': req.user.id
          }
        ]
      }).exec().then(function(doc) {
        var comment;
        if (doc) {
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
    app.post('/design/stl/complete/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(design) {
        if (design) {
          return userModel.findOne({
            _id: design.designer
          }).exec().then(function(user) {
            var files, payload, paypalSdk, stringerror;
            if (user) {
              files = req.files.file;
              if (Array.isArray(req.files.file[0])) {
                stringerror = encodeURIComponent("Too files");
                return res.redirect('design/project/' + req.params.id + '?error=' + stringerror);
              } else {
                user.onTime = true;
                design.final_stl = files[0].path.replace(/^.*[\\\/]/, '');
                design.status = models.DESIGN_STATUSES.DELIVERED[0];
                paypalSdk = new Paypal({
                  userId: settings.paypal.adaptive.user,
                  password: settings.paypal.adaptive.password,
                  signature: settings.paypal.adaptive.signature,
                  appId: settings.paypal.adaptive.appId,
                  sandbox: settings.paypal.adaptive.debug
                });
                payload = {
                  payKey: design.payKey,
                  requestEnvelope: {
                    errorLanguage: 'en_US'
                  }
                };
                paypalSdk.executePayment(payload);
                if (design.timeExpiredPayKey) {
                  payload = {
                    payKey: design.timeExpiredPayKey,
                    requestEnvelope: {
                      errorLanguage: 'en_US'
                    }
                  };
                  paypalSdk.executePayment(payload, function() {});
                }
                design.save();
                user.save();
                return userModel.findOne({
                  _id: design.creator
                }).exec().then(function(creator) {
                  if (creator) {
                    if (creator.mailNotification) {
                      mailer.send('mailer/design/completed', {
                        project: design,
                        url: ("http://" + req.headers.host + "/design/project/") + design._id
                      }, {
                        from: settings.mailer.noReply,
                        to: creator.email,
                        subject: "Design project " + design.title + ' completed'
                      });
                    }
                    if (user.VatNumber) {
                      mailer.send('mailer/design/vatnumber', {
                        designer: user,
                        design: design,
                        user: creator
                      }, {
                        from: settings.mailer.noReply,
                        to: settings.admins.emails,
                        subject: "Paied designer with VAT number"
                      });
                    }
                    return res.redirect('design/project/' + req.params.id);
                  } else {
                    return res.send(500);
                  }
                });
              }
            } else {
              return res.send(500);
            }
          });
        } else {
          return res.send(404);
        }
      }).fail(function(error) {
        console.log(error);
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/design/stl/denyMoreTime/:id', decorators.loginRequired, function(req, res) {
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(design) {
        if (design) {
          design.status = models.DESIGN_STATUSES.TIMEEXPIREDPROCESSED[0];
          return design.save(function(err) {
            if (err) {
              logger.error(reason);
              return res.send(500);
            } else {
              userModel.findOne({
                _id: design.designer
              }).exec().then(function(designer) {
                if (designer) {
                  designer.onTime = true;
                  return designer.save();
                } else {
                  logger.error('designer not found');
                  return res.send(500);
                }
              }).fail(function(error) {
                logger.error(error);
                return res.send(500);
              });
              return res.redirect('design/project/' + design.id);
            }
          });
        } else {
          return res.send(404);
        }
      }).fail(function(error) {
        logger.error(error);
        return res.send(500);
      });
    });
    app.post('/design/stl/confirmMoreTime/:id', decorators.loginRequired, function(req, res) {
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(design) {
        var businessGain, businessPayment, designerPayment, moreTime, oldValue, paypalSdk, stringerror, taxes;
        if (design) {
          moreTime = parseInt(req.body.moreTime);
          if (design.additionalHourRequested === moreTime) {
            oldValue = design.order;
            design.order = {
              preHourly: oldValue.preHourly + design.additionalHourRequested,
              preAmount: oldValue.preAmount,
              designer: oldValue.designer,
              placedAt: oldValue.placedAt
            };
            designerPayment = design.additionalHourRequested * design.order.preAmount;
            businessGain = designerPayment * settings.payment.threeDoersDesigner;
            taxes = businessGain * settings.payment.taxes;
            businessPayment = designerPayment + businessGain + taxes;
            design.designerPayment += designerPayment;
            design.businessGain += businessGain;
            design.taxes += taxes;
            design.businessPayment += businessPayment;
            paypalSdk = new Paypal({
              userId: settings.paypal.adaptive.user,
              password: settings.paypal.adaptive.password,
              signature: settings.paypal.adaptive.signature,
              appId: settings.paypal.adaptive.appId,
              sandbox: settings.paypal.adaptive.debug
            });
            return auth.User.findOne({
              _id: design.designer
            }).exec().then(function(user) {
              var payload;
              if (user) {
                payload = {
                  requestEnvelope: {
                    errorLanguage: 'en_US'
                  },
                  actionType: 'PAY_PRIMARY',
                  payKeyDuration: 'P29D',
                  currencyCode: 'EUR',
                  feesPayer: 'EACHRECEIVER',
                  memo: 'Payment for 3D printing in 3doers',
                  returnUrl: "" + settings.site + "/design/project/timeExpired/pay/execute/" + design.id,
                  cancelUrl: "" + settings.site + "/design/project/timeExpired/pay/cancel/" + design.id,
                  receiverList: {
                    receiver: [
                      {
                        email: '3doers@gmail.com',
                        amount: businessPayment,
                        primary: 'true'
                      }, {
                        email: user.email,
                        amount: designerPayment,
                        primary: 'false'
                      }
                    ]
                  }
                };
                return paypalSdk.pay(payload, function(err, response) {
                  if (err) {
                    console.log(response.error);
                    logger.error(err);
                    return res.send(500);
                  } else {
                    design.timeExpiredPayKey = response.payKey;
                    design.secundaryExpiredPaid = false;
                    design.save();
                    user.onTime = true;
                    user.save();
                    return res.redirect(response.paymentApprovalUrl);
                  }
                });
              }
            });
          } else {
            stringerror = encodeURIComponent("value not allowed");
            return res.redirect('design/project/' + req.params.id + '?error=' + stringerror);
          }
        } else {
          return res.send(404);
        }
      }).fail(function(error) {
        logger.error(error);
        return res.send(500);
      });
    });
    app.post('/design/stl/needMoreTime/:id', decorators.loginRequired, function(req, res) {
      var extraTimeValue;
      extraTimeValue = [1, 3, 5];
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(design) {
        var moreTime, stringerror;
        if (design) {
          moreTime = parseInt(req.body.moreTime);
          if (extraTimeValue.indexOf(moreTime) >= 0) {
            design.additionalHourRequested = moreTime;
            design.status = models.DESIGN_STATUSES.TIMEREQUIRECONFIRM[0];
            design.save();
            return auth.User.findOne({
              _id: design.designer
            }).exec().then(function(user) {
              user.numberOfDelay += 1;
              user.save();
              return res.redirect('design/project/' + design.id);
            }).fail(function() {
              logger.error(arguments);
              return res.send(500);
            });
          } else {
            stringerror = encodeURIComponent("value not allowed");
            return res.redirect('design/project/' + req.params.id + '?error=' + stringerror);
          }
        } else {
          return res.send(404);
        }
      }).fail(function(error) {
        logger.error(error);
        return res.send(500);
      });
    });
    app.post('/design/project/pay/:id', decorators.loginRequired, function(req, res) {
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(design) {
        var paypalSdk;
        if (design) {
          design.designerPayment = Math.round(design.order.preHourly * design.order.preAmount) / 100;
          design.businessGain = Math.round(design.designerPayment * settings.payment.threeDoersDesigner) / 100;
          design.taxes = Math.round(design.businessGain * settings.payment.taxes) / 100;
          design.businessPayment = design.designerPayment + design.businessGain + design.taxes;
          console.log(design.businessPayment);
          console.log('compute');
          paypalSdk = new Paypal({
            userId: settings.paypal.adaptive.user,
            password: settings.paypal.adaptive.password,
            signature: settings.paypal.adaptive.signature,
            appId: settings.paypal.adaptive.appId,
            sandbox: settings.paypal.adaptive.debug
          });
          return auth.User.findOne({
            _id: design.designer
          }).exec().then(function(user) {
            var payload;
            if (user) {
              payload = {
                requestEnvelope: {
                  errorLanguage: 'en_US'
                },
                actionType: 'PAY_PRIMARY',
                payKeyDuration: 'P29D',
                currencyCode: 'EUR',
                feesPayer: 'EACHRECEIVER',
                memo: 'Payment for 3D printing in 3doers',
                returnUrl: "" + settings.site + "/design/project/pay/execute/" + design.id,
                cancelUrl: "" + settings.site + "/design/project/pay/cancel/" + design.id,
                receiverList: {
                  receiver: [
                    {
                      email: '3doers@gmail.com',
                      amount: design.businessPayment,
                      primary: 'true'
                    }, {
                      email: user.email,
                      amount: design.designerPayment,
                      primary: 'false'
                    }
                  ]
                }
              };
              console.log('pay');
              return paypalSdk.pay(payload, function(err, response) {
                if (err) {
                  console.log(response.error);
                  logger.error(err);
                  return res.send(500);
                } else {
                  design.payKey = response.payKey;
                  design.secundaryPaid = false;
                  design.save();
                  return res.redirect(response.paymentApprovalUrl);
                }
              });
            }
          });
        } else {
          return res.send(404);
        }
      }).fail(function(error) {
        console.log(error);
        logger.error(error);
        return res.send(500);
      });
    });
    app.get('/design/project/timeExpired/pay/execute/:id', decorators.loginRequired, function(req, res) {
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc) {
          return auth.User.findOne(doc.designer).exec().then(function(user) {
            doc.status = models.DESIGN_STATUSES.TIMEEXPIREDPROCESSED[0];
            doc.save();
            res.redirect("/design/project/" + doc.id);
            return res.redirect("/design/project/" + doc.id);
          });
        }
      }).fail(function(error) {
        console.log(error);
        logger.error(error);
        return res.send(500);
      });
    });
    app.get('/design/project/timeExpired/pay/cancel/:id', decorators.loginRequired, function(req, res) {
      return res.redirect("design/project/" + req.params.id);
    });
    app.get('/design/project/pay/cancel/:id', decorators.loginRequired, function(req, res) {
      return res.redirect("design/project/" + req.params.id);
    });
    app.get('/design/project/pay/execute/:id', decorators.loginRequired, function(req, res) {
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc) {
          return auth.User.findOne(doc.designer).exec().then(function(user) {
            doc.status = models.DESIGN_STATUSES.PAID[0];
            console.log(doc);
            doc.save();
            mailer.send('mailer/design/payed', {
              project: doc,
              user: user,
              site: settings.site
            }, {
              from: settings.mailer.noReply,
              to: [user.email],
              subject: settings.project.payed.subject
            });
            return res.redirect("/design/project/" + req.params.id);
          });
        }
      }).fail(function(error) {
        console.log(error);
        logger.error(error);
        return res.send(500);
      });
    });
    app.post('/design/project/rate/:id', decorators.loginRequired, function(req, res) {
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(design) {
        var e, rate, stringerror;
        if (design) {
          try {
            rate = parseFloat(req.body.rate);
          } catch (_error) {
            e = _error;
            stringerror = e.toString();
            return res.redirect('design/project/' + req.params.id + '?error=' + stringerror);
          }
          if (rate < 0 || rate > 5) {
            stringerror = encodeURIComponent("value not allowed");
            return res.redirect('design/project/' + req.params.id + '?error=' + stringerror);
          }
          design.rate = rate;
          design.status = models.DESIGN_STATUSES.ARCHIVED[0];
          design.save();
          return userModel.findOne({
            _id: design.designer
          }).exec().then(function(user) {
            if (user) {
              return models.STLDesign.find({
                designer: user.id,
                status: {
                  "$gte": models.DESIGN_STATUSES.DELIVERED[0]
                }
              }).exec().then(function(designsWork) {
                var TotalRate, work, _i, _len;
                if (designsWork) {
                  TotalRate = 0;
                  console.log('before' + TotalRate);
                  for (_i = 0, _len = designsWork.length; _i < _len; _i++) {
                    work = designsWork[_i];
                    console.log(work.rate);
                    TotalRate += work.rate;
                  }
                  console.log('after' + TotalRate);
                  console.log(designsWork.length);
                  user.rate = TotalRate / designsWork.length;
                  user.save();
                  return res.redirect('design/project/' + req.params.id);
                }
              }).fail(function() {
                logger.error(arguments);
                return res.send(500);
              });
            } else {
              return res.send(500);
            }
          }).fail(function() {
            logger.error(arguments);
            return res.send(500);
          });
        } else {
          return res.send(404);
        }
      }).fail(function(error) {
        logger.error(error);
        return res.send(500);
      });
    });
    return app.post('/design/stl/upload', decorators.loginRequired, function(req, res) {
      var design, files, i, resources, stringerror;
      files = req.files.file;
      resources = [];
      if (Array.isArray(req.files.file[0])) {
        console.log("more then one file");
        if (req.files.file[0].length > 4) {
          i = 0;
          while (i < files[0].length) {
            fs.unlinkSync(files[0][i].path);
            console.log("Removed" + files[0][i].path);
            i++;
          }
          stringerror = encodeURIComponent("Too files");
          return res.redirect('/design/stl/?error=' + stringerror);
        } else {
          i = 0;
          while (i < files[0].length) {
            resources.push(files[0][i].path.replace(/^.*[\\\/]/, ''));
            console.log(files[0][i].path.replace(/^.*[\\\/]/, ''));
            i++;
          }
        }
      } else {
        console.log("just one file");
        resources.push(files[0].path.replace(/^.*[\\\/]/, ''));
        console.log(files[0].path.replace(/^.*[\\\/]/, ''));
      }
      console.log("RESOURCE FILE");
      console.log(resources);
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
          return res.redirect("design/projects");
        }
      });
    });
  };

}).call(this);
