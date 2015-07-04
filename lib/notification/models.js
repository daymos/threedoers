(function() {
  var NOTIFICATION_STATE, Notification, ObjectId, Schema, gridfs, inflection, mongoose;

  mongoose = require('mongoose');

  gridfs = require('../gridfs');

  inflection = require('inflection');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  module.exports.NOTIFICATION_STATE = NOTIFICATION_STATE = {
    MESSAGE: [1, 'message'],
    CHANGE_STATUS: [2, 'change_status']
  };

  Notification = new Schema({
    read: {
      type: Boolean,
      "default": false
    },
    type: {
      type: Number,
      "default": NOTIFICATION_STATE.MESSAGE[0],
      required: true
    },
    creator: {
      type: ObjectId,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    createAt: {
      type: Date,
      "default": Date.now
    },
    recipient: {
      type: ObjectId,
      required: true
    },
    refertourl: {
      type: String,
      require: true
    },
    deleted: {
      type: Boolean,
      "default": false
    },
    relatedObject: {
      type: ObjectId
    }
  });

  module.exports.Notification = mongoose.model('Notification', Notification);

}).call(this);
