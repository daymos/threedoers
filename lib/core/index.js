(function() {
  var app, express;

  express = require('express');

  app = module.exports = express();

  app.get('/', function(req, res) {
    if (!req.user) {
      return res.redirect('/accounts/login/local');
    }
  });

}).call(this);
