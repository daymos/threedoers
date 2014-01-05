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

  verifyStatus: Boolean # Used to check status

  createdAt:
    type: Date
    expires: "1.5h"


Activation
  .method 'makeSalt', () ->
    Math.round((new Date().valueOf() * Math.random())) + ''


Activation
  .method 'encryptText', (text) ->
    crypto.createHmac('sha1', @salt).update(text).digest('hex')


Activation.pre "save", (next) ->
  @salt = @makeSalt()
  @hashedEmail = @encryptText(@email)
  next()


# Expose Activation Status
exports.Activation = mongoose.model("Activation", Activation)
