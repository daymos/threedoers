fs = require 'fs'
mongoose = require 'mongoose'
crypto = require 'crypto'

SALT_WORK_FACTOR = 10

# Activation Schema
Activation = mongoose.Schema
  email:
    type: String
    required: true
    unique: true

  hashedEmail:
    type: String
    required: true
    unique: true

  activated:
    type: Boolean
    default: false

  createdAt:
    type: Date
    expires: 60*60*24*2  # in two days


Activation
  .method 'makeSalt', () ->
    Math.round((new Date().valueOf() * Math.random())) + ''


Activation
  .method 'encryptText', (text) ->
    crypto.createHmac('sha1', @salt).update(text).digest('hex')


Activation.pre 'validate', (next) ->
  unless @hashedEmail
    @salt = @makeSalt()
    @hashedEmail = @encryptText(@email)
  next()


# Expose Activation Status
exports.Activation = mongoose.model("Activation", Activation)
