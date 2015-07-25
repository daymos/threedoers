/**
 *  Copyright (c) 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


module.exports.NOTIFICATION_STATE = {
  MESSAGE: [1, 'message'],
  CHANGE_STATUS: [2, 'change_status']
};


var Notification = new Schema({

  read: {
    type: Boolean,
    "default": false
  },

  type: {
    type: Number,
    "default": module.exports.NOTIFICATION_STATE.MESSAGE[0],
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
