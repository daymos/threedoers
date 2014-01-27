(function() {
  module.exports = function(app) {
    var auth, decorators, logger, mailer;
    logger = require("../logger");
    auth = require("../auth/models");
    decorators = require('../decorators');
    mailer = require('../mailer').mailer;
    app.get('/admin/users', decorators.adminRequired, function(req, res) {
      return auth.User.find(function(err, users) {
        return res.render('admin/users', {
          users: users
        });
      });
    });
    app.get('/admin/printer/request', decorators.adminRequired, function(req, res) {
      return auth.User.find({
        printer: "request"
      }, function(err, users) {
        return res.render('admin/printer_requests', {
          users: users
        });
      });
    });
    app.post('/admin/printer/accept/:id', decorators.adminRequired, function(req, res) {
      return auth.User.findOne({
        _id: req.params.id,
        printer: "request"
      }, function(err, user) {
        mailer.send('mailer/printer/accepted', {}, {
          from: settings.mailer.noReply,
          to: [user.email],
          subject: settings.printer.accepted.subject
        });
        user.printer = "accepted";
        user.save();
        return res.send(200);
      });
    });
    return app.get('/admin/printer/deny/:id', decorators.adminRequired, function(req, res) {
      return auth.User.findOne({
        _id: req.params.id,
        printer: "request"
      }, function(err, user) {
        mailer.send('mailer/printer/denied', {}, {
          from: settings.mailer.noReply,
          to: [user.email],
          subject: settings.printer.denied.subject
        });
        user.printer = "denied";
        user.save();
        return res.send(200);
      });
    });
  };

}).call(this);
