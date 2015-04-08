(function() {
  module.exports = function(app) {
    var LocalStrategy, auth, decorators, desigModel, fs, gridfs, logger, models, passport, settings, userModel, uuid;
    auth = require('../auth/models');
    uuid = require('node-uuid');
    logger = require('../logger');
    LocalStrategy = require("passport-local").Strategy;
    passport = require("passport");
    decorators = require('../decorators');
    models = require('./models');
    fs = require('fs');
    gridfs = require('../gridfs');
    userModel = require('../auth/models');
    desigModel = require('../design/models');
    settings = require('../../config');
    app.post('/api/get_projects_for_user', function(req, res) {
      console.log('/api/get_projects_for_user' + req.query.token);
      return userModel.User.findOne({
        token: req.query.token
      }).exec().then(function(user) {
        if (!user) {
          res.json;
          return {
            status: -1,
            error: 'No User found with this Access Token'
          };
        } else {
          console.log("id user:" + user.id);
          return desigModel.STLDesign.findOne({
            "designer": user.id,
            status: {
              "$lt": desigModel.DESIGN_STATUSES.DELIVERED[0],
              "$gte": desigModel.DESIGN_STATUSES.ACCEPTED[0]
            }
          }).exec().then(function(docs) {
            var project, projects;
            if (docs) {
              console.dir(docs.order);
              project = {
                project_id: docs.id,
                project_name: docs.title,
                project_description: docs.description,
                project_total_time_logged: docs.project_total_time_logged,
                project_status: true,
                project_total_amount: docs.order.preHourly * docs.order.preAmount,
                project_estimated_time: docs.order.preHourly * 60
              };
              projects = [];
              projects.push(project);
              return res.json({
                status: 0,
                error: null,
                projects: projects
              });
            } else {
              console.log("i DON'T have projects");
              return res.json({
                status: -1,
                error: 'No Projects for this User'
              });
            }
          }).fail(function(reason) {
            logger.error(reason);
            console.log("SERVER ERROR 1" + reason);
            return res.json({
              status: -1,
              error: 'Server Error, please retry later'
            });
          });
        }
      }).fail(function(reason) {
        logger.error(reason);
        console.log("SERVER ERROR 2");
        return res.json({
          status: -1,
          error: 'Server Error, please retry later'
        });
      });
    });
    app.post('/api/create_work_session', function(req, res) {
      return userModel.User.findOne({
        token: req.query.token
      }).exec().then(function(user) {
        if (!user) {
          res.json;
          return {
            status: -1,
            error: 'No User found with this Access Token'
          };
        } else {
          if (!user.onTime) {
            res.json({
              status: -1,
              error: 'The time is finished require extra time form the website'
            });
          }
          return models.WorkSession.findOne({
            "session_project_id": req.query.project_id
          }).sort('-session_number').sort('-session_date_stamp').limit(1).exec().then(function(session) {
            var session_number, ws;
            session_number = 0;
            if (session) {
              session_number = session.session_number;
            }
            ws = new models.WorkSession;
            if (req.query.mode === 'start') {
              ws.session_project_id = req.query.project_id;
              ws.session_number = (session_number * 1) + 1;
              ws.session_date_stamp = new Date(req.query.creation_date);
              ws.session_screen_shot = null;
            } else {
              ws.session_project_id = req.query.project_id;
              ws.session_number = session_number * 1;
              ws.session_date_stamp = new Date(req.query.creation_date);
              if (fs.statSync(req.files.image.path).size > 0) {
                ws.session_screen_shot = req.files.image.path.replace(/^.*[\\\/]/, '');
              } else {
                ws.session_screen_shot = null;
              }
              desigModel.STLDesign.findOne({
                _id: req.query.project_id
              }).exec().then(function(design) {
                var diffMs;
                console.log('create sessione');
                if (design) {
                  diffMs = (new Date(req.query.creation_date)) - session.session_date_stamp;
                  design.project_total_time_logged += Math.floor((diffMs / 1000) / 60);
                  if (design.project_total_time_logged / 60 >= design.order.preHourly) {
                    user.onTime = false;
                    design.status = desigModel.DESIGN_STATUSES.TIMEEEXPIRED[0];
                    user.save();
                  }
                  return design.save();
                }
              });
            }
            ws.save(function(err) {
              if (err) {
                return res.json({
                  status: -1,
                  error: 'Server Error, please retry later'
                });
              }
            });
            if (!user.onTime) {
              return res.json({
                status: -1,
                error: 'The time is finished require extra time form the website'
              });
            } else {
              return res.json({
                status: 0,
                error: null,
                project_id: req.query.project_id,
                session_number: ws.session_number
              });
            }
          }).fail(function(reason) {
            logger.error(reason);
            console.log("SERVER ERROR QUERYING WS");
            return res.json({
              status: -1,
              error: 'Server Error, please retry later'
            });
          });
        }
      }).fail(function(reason) {
        logger.error(reason);
        console.log("SERVER ERROR QUERYING USER" + reason);
        return res.json({
          status: -1,
          error: 'Server Error, please retry later'
        });
      });
    });
    return app.post('/api/login', function(req, res) {
      var password, username;
      username = req.query.username;
      password = req.query.password;
      return userModel.User.findOne({
        username: username
      }).exec().then(function(user) {
        if (user) {
          if (!user.authenticate(password)) {
            res.json({
              status: -1,
              error: 'Wrong Username or Password'
            });
          } else {
            if (!user.onTime) {
              res.json({
                status: -1,
                error: 'Time expired'
              });
            }
            user.token = uuid.v4();
            user.save(function(err) {
              if (err) {
                res.json;
                return {
                  status: -1,
                  error: 'Server Error, please retry later'
                };
              }
            });
            res.json({
              status: 0,
              error: null,
              category: 'designers',
              token: user.token
            });
          }
        } else {

        }
        return res.json({
          status: -1,
          error: 'Wrong Username or Password'
        });
      }).fail(function(reason) {
        logger.error(reason);
        return res.json({
          status: -1,
          error: 'Server Error, please retry later'
        });
      });
    });
  };

}).call(this);
