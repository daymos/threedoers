(function() {
  module.exports = function(app) {
    var auth, decorators, logger, models;
    auth = require('../auth/models');
    logger = require('../logger');
    decorators = require('../decorators');
    models = require('./models');
    app.get('/ask/stl', decorators.loginRequired, function(req, res) {
      return res.render('ask/stl');
    });
    return app.post('/ask/stl/upload', decorators.loginRequired, function(req, res) {
      console.log(req.body);
      console.log(req.files.length);
      return console.log(req.files);
    });
  };

}).call(this);
