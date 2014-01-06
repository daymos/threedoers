(function() {
  var Activation, SALT_WORK_FACTOR, crypto, fs, mongoose;

  fs = require('fs');

  mongoose = require('mongoose');

  crypto = require('crypto');

  SALT_WORK_FACTOR = 10;

  Activation = mongoose.Schema({
    email: {
      type: String,
      required: true,
      unique: true
    },
    hashedEmail: {
      type: String,
      required: true,
      unique: true
    },
    activated: {
      type: Boolean,
      "default": false
    },
    createdAt: {
      type: Date,
      expires: "1.5h"
    }
  });

  Activation.method('makeSalt', function() {
    return Math.round(new Date().valueOf() * Math.random()) + '';
  });

  Activation.method('encryptText', function(text) {
    return crypto.createHmac('sha1', this.salt).update(text).digest('hex');
  });

  Activation.pre('validate', function(next) {
    if (!this.hashedEmail) {
      this.salt = this.makeSalt();
      this.hashedEmail = this.encryptText(this.email);
    }
    return next();
  });

  exports.Activation = mongoose.model("Activation", Activation);

}).call(this);
