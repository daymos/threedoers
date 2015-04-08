(function() {
  module.exports = function(app) {
    var Worksession, auth, decorators, fs, logger, mailer, models, settings, userModel, utils;
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
    settings = require('../../config');
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
              "$lt": models.DESIGN_STATUSES.PREACCEPTED[0]
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
      console.log("/design/proposal/review/:id");
      return models.Proposal.findOne({
        _id: req.params.id,
        accepted: false
      }).exec().then(function(prop) {
        if (prop) {
          prop.accepted = true;
          prop.save();
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
            stldes.status = models.DESIGN_STATUSES.PREACCEPTED[0];
            stldes.designer = prop.creator;
            i = 0;
            while (i < stldes.proposal.length) {
              if (stldes.proposal[i]._id.toString() === prop._id.toString()) {
                stldes.proposal[i].accepted = prop.accepted;
                break;
              }
              i++;
            }
            stldes.save();
            return res.redirect("design/project/" + stldes._id);
          }).fail(function() {
            logger.error(arguments);
            return res.send(500);
          });
        } else {
          console.log('else');
          return models.STLDesign.findOne({
            "creator": req.user.id
          }).exec().then(function(doc) {
            console.log('query stldesign');
            if (doc) {
              console.log(doc);
              return res.redirect("design/project/" + doc._id, {
                projects: doc,
                toApply: true,
                error: "Some errors for this proposal"
              });
            } else {
              return console.log('not doc');
            }
          }).fail(function() {
            logger.error(arguments);
            return res.send(500);
          });
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
          "$lte": models.DESIGN_STATUSES.ARCHIVED[0]
        }
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          console.log(docs);
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
        var proposal;
        if (doc) {
          if (req.body.hours && req.body.cost) {
            proposal = new models.Proposal;
            proposal.creator = req.user.id;
            proposal.username = req.user.username;
            proposal.userRate = req.user.rate;
            proposal.timeRate = req.user.timeRate;
            proposal.hour = req.body.hours;
            proposal.backref = req.params.id;
            proposal.cost = req.body.cost;
            proposal.createAt = Date.now();
            proposal.save();
            doc.proposal.push(proposal);
            return doc.save(function(err, doc) {
              if (err) {
                logger.error(err);
                return res.send(500);
              } else {
                return res.redirect("/");
              }
            });
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
            return res.render('design/project/detail', {
              statuses: models.DESIGN_STATUSES,
              project: doc,
              adminMail: settings.admins.emails,
              designSessions: designSessions
            });
          }).fail(function(reason) {
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
    app.post('/design/accept/:id', decorators.filemanagerRequired, function(req, res) {
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc) {
          return auth.User.findOne(doc.creator).exec(function(err, user) {
            var designer, proposal, _i, _len, _ref;
            if (user) {
              console.log(user._id);
              designer = '';
              _ref = doc.proposal;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                proposal = _ref[_i];
                if (proposal.accepted) {
                  designer = proposal.creator;
                }
              }
              if (designer !== '') {
                return models.STLDesign.findOne({
                  "designer": designer,
                  status: {
                    "$lt": models.DESIGN_STATUSES.DELIVERED[0],
                    "$gte": models.DESIGN_STATUSES.ACCEPTED[0]
                  }
                }).exec().then(function(activeProjects) {
                  console.log(activeProjects);
                  if (activeProjects) {
                    return res.json({
                      msg: "You have a pending project, complete it to accept an other"
                    }, 400);
                  } else {
                    return auth.User.findOne({
                      _id: proposal.creator
                    }).exec().then(function(user) {
                      user.designJobs += 1;
                      user.save();
                      doc.status = models.DESIGN_STATUSES.ACCEPTED[0];
                      doc.save();
                      return res.json({
                        msg: "Accepted"
                      });
                    }).fail(function() {
                      logger.error(arguments);
                      return res.send(500);
                    });
                  }
                }).fail(function() {
                  logger.error(arguments);
                  return res.send(500);
                });
              } else {
                return res.json({
                  msg: "Looks like someone accepted, try with another"
                }, 400);
              }
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
            var files, stringerror;
            if (user) {
              files = req.files.file;
              if (Array.isArray(req.files.file[0])) {
                stringerror = encodeURIComponent("Too files");
                return res.redirect('design/project/' + req.params.id + '?error=' + stringerror);
              } else {
                user.onTime = true;
                design.final_stl = files[0].path.replace(/^.*[\\\/]/, '');
                design.status = models.DESIGN_STATUSES.DELIVERED[0];
                design.save();
                user.save();
                return userModel.findOne({
                  _id: design.designer
                }).exec().then(function(creator) {
                  if (creator) {
                    return mailer.send('mailer/design/completed', {
                      project: design,
                      url: ("http://" + req.headers.host + "/design/project/") + design._id
                    }, {
                      from: settings.mailer.noReply,
                      to: creator.email,
                      subject: "Design project " + design.title + ' completed'
                    }).then(function() {
                      return res.redirect('design/project/' + req.params.id);
                    });
                  } else {
                    return res.send(500);
                  }
                }).fail(function() {
                  logger.error(arguments);
                  return res.send(500);
                });
              }
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
        var moreTime, oldValue, stringerror;
        if (design) {
          moreTime = parseInt(req.body.moreTime);
          console.log(moreTime);
          if (design.additionalHourRequested === moreTime) {
            oldValue = design.order;
            design.order = {
              preHourly: oldValue.preHourly + design.additionalHourRequested,
              preAmount: oldValue.preAmount,
              designer: oldValue.designer,
              placedAt: oldValue.placedAt
            };
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
      console.log(req.params.id);
      return models.STLDesign.findOne({
        _id: req.params.id
      }).exec().then(function(design) {
        if (design) {
          design.status = models.DESIGN_STATUSES.PAID[0];
          console.log(design);
          design.save();
          return res.redirect('design/project/' + req.params.id);
        } else {
          return res.send(404);
        }
      }).fail(function(error) {
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
                  console.log(designsWork);
                  for (_i = 0, _len = designsWork.length; _i < _len; _i++) {
                    work = designsWork[_i];
                    TotalRate += work.rate;
                  }
                  console.log(TotalRate);
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
