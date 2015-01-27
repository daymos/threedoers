mongoose = require 'mongoose'
gridfs = require '../gridfs'
inflection = require 'inflection'




###############################################
# Constants
###############################################

module.exports.NOTIFICATION_STATE=
  MESSAGE: [1, 'message']
  CHANGE_STATUS: [2, 'change_status']


###############################################
# Models
###############################################



Notification = mongoose.Schema
  read:
    type:Boolean
    default: false

  type:
    type: Number
    default: NOTIFICATION_STATE.MESSAGE[0]
    required: true

  creator:
    type: ObjectId
    required: true

  createAt:
    type: Date
    default: Date.now

  recipient:
    type: ObjectId
    required: true

  refertourl:
    type:String
    require:true

# Expose Activation Status
exports.Notification = mongoose.model("Notification", Notification)