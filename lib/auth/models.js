(function() {
  var ObjectId, Schema, User, crypto, fs, mongoose;

  fs = require("fs");

  mongoose = require('mongoose');

  crypto = require('crypto');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  User = new Schema({
    firstName: {
      type: String
    },
    lastName: {
      type: String
    },
    email: {
      type: String,
      required: true,
      index: {
        unique: true
      }
    },
    username: {
      type: String,
      required: true,
      index: {
        unique: true
      }
    },
    active: {
      type: Boolean,
      "default": false
    },
    city: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    hashedPassword: {
      type: String,
      required: true
    },
    salt: {
      type: String,
      required: true
    },
    location: {
      type: [],
      required: true
    }
  });

  User.index({
    loc: '2d'
  });

  User.virtual('password').set(function(password) {
    this.salt = this.makeSalt();
    return this.hashedPassword = this.encryptPassword(password);
  });

  User.method('makeSalt', function() {
    return Math.round(new Date().valueOf() * Math.random()) + '';
  });

  User.method('encryptPassword', function(password) {
    return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
  });

  User.method('authenticate', function(plainText) {
    return this.encryptPassword(plainText) === this.hashedPassword;
  });

  module.exports.User = mongoose.model('User', User);

}).call(this);
