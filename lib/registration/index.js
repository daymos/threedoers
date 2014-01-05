(function() {
  var app, cl, countryList, express;

  express = require('express');

  countryList = require("country-selector/nodejs.countryList.js");

  app = module.exports = express();

  cl = countryList.countryList();

  app.get('/accounts/signup', function(req, res) {
    return res.render('registration/signup', {
      countries: cl
    });
  });

}).call(this);
