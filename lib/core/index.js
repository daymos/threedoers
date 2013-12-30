(function() {
  var app, express;

  express = require('express');

  app = module.exports = express();

  app.get('/', function(req, res) {
    return res.render('core/index');
  });

}).call(this);
