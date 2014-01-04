(function() {
  var ObjectId, Schema, User, crypto, fs, mongoose;

  fs = require("fs");

  mongoose = require('mongoose');

  crypto = require('crypto');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  User = new Schema({
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
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
      "default": true
    },
    hashedPassword: String,
    salt: String
  });

  User.virtual('password').set(function(password) {
    this.salt = this.makeSalt();
    return this.hashed_password = this.encryptPassword(password);
  });

  User.method('makeSalt', function() {
    return Math.round(new Date().valueOf() * Math.random()) + '';
  });

  User.method('encryptPassword', function(password) {
    return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
  });

  User.method('authenticate', function(plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  });

  module.exports.User = mongoose.model('User', User);

}).call(this);
