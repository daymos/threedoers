express = require 'express'
countryList = require "country-selector/nodejs.countryList.js"


app = module.exports = express()
cl = countryList.countryList()

app.get '/accounts/signup', (req, res) ->
  res.render 'registration/signup', {countries: cl}