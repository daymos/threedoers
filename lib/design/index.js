(function() {
  module.exports = function(app) {
    var auth, decorators, fs, logger, mailer, models, settings, utils;
    fs = require('fs');
    auth = require('../auth/models');
    logger = require('../logger');
    decorators = require('../decorators');
    models = require('./models');
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
          models.STLDesign.findOne({
            _id: prop.backref
          }).exec().then(function(stldes) {
            var i;
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
            return stldes.save();
          }).fail(function() {
            logger.error(arguments);
            return res.send(500);
          });
          return res.redirect("design/projects");
        } else {
          return models.STLDesign.find({
            "creator": req.user.id
          }).exec().then(function(doc) {
            if (doc) {
              return res.render('design/proposal', {
                projects: doc,
                toApply: true,
                error: "Some errors for this proposal"
              });
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
          "$lt": models.DESIGN_STATUSES.PAID[0],
          "$gte": models.DESIGN_STATUSES.PREACCEPTED[0]
        }
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.render('design/project/list_projects', {
            projects: docs
          });
        }
      });
    });
    app.get('/design/jobs', decorators.filemanagerRequired, function(req, res) {
      return models.STLDesign.find({
        designer: req.user.id,
        status: {
          "$lt": models.DESIGN_STATUSES.PAID[0],
          "$gte": models.DESIGN_STATUSES.PREACCEPTED[0]
        }
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
            designer: req.user.id
          }
        ]
      }).exec().then(function(doc) {
        if (doc) {
          return res.render('design/project/detail', {
            statuses: models.DESIGN_STATUSES,
            project: doc
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
            if (user) {
              doc.status = models.DESIGN_STATUSES.ACCEPTED[0];
              doc.save();
              return res.json({
                msg: "Accepted"
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
          return res.redirect("/design/proposal");
        }
      });
    });
  };

}).call(this);
