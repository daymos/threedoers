(function() {
  module.exports = function(app) {
    var decorators, logger, mailer, settings;
    decorators = require('../decorators');
    logger = require('../logger');
    mailer = require('../mailer').mailer;
    settings = require('../../config');
    app.get('/', function(req, res) {
      return res.render('core/index');
    });
    app.get('/become', decorators.loginRequired, function(req, res) {
      return res.render('core/become');
    });
    return app.post('/become', decorators.loginRequired, function(req, res) {
      mailer.send('mailer/core/become', {
        user: req.user
      }, {
        from: req.user.email,
        to: settings.admins.emails,
        subject: "New Become a Printer Request"
      });
      return res.render('core/become_done');
    });
  };

}).call(this);
