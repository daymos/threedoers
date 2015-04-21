mongoose = require 'mongoose'
gridfs = require '../gridfs'
inflection = require 'inflection'

Schema = mongoose.Schema
ObjectId = Schema.ObjectId

###############################################
# Constants
###############################################

module.exports.NOTIFICATION_STATE= NOTIFICATION_STATE =
  MESSAGE: [1, 'message']
  CHANGE_STATUS: [2, 'change_status']


###############################################
# Models
###############################################



Notification = new Schema
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

  title:
    type: String
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

  deleted:
    type: Boolean
    default: false

# Expose Activation Status
module.exports.Notification = mongoose.model 'Notification', Notification