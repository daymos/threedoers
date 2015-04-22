(function() {
  module.exports = function(app) {
    var auth, decorators, logger, models;
    auth = require('../auth/models');
    logger = require('../logger');
    decorators = require('../decorators');
    models = require('./models');
    app.get('/notifications', decorators.loginRequired, function(req, res) {
      return models.Notification.find({
        recipient: req.user.id,
        type: 2
      }).sort({
        createAt: 'desc'
      }).limit(15).exec().then(function(nots) {
        return res.render('notification/notifications', {
          userNotif: nots
        });
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      });
    });
    app.post('/getNotifications', decorators.loginRequired, function(req, res) {
      return models.Notification.find({
        recipient: req.user.id,
        type: 2,
        read: false
      }).exec().then(function(nots) {
        if (nots) {
          return res.json({
            notifications: nots
          });
        } else {
          return res.json({
            notifications: {}
          });
        }
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      });
    });
    return app.post('/notification/read/:id', decorators.loginRequired, function(req, res) {
      return models.Notification.findOne({
        _id: req.params.id,
        read: false
      }).exec().then(function(notf) {
        if (notf) {
          notf.read = true;
          return notf.save();
        }
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      });
    });
  };

}).call(this);
