mongoose = require 'mongoose'
gridfs = require '../gridfs'
inflection = require 'inflection'

Schema = mongoose.Schema
ObjectId = Schema.ObjectId

###############################################
# Constants
###############################################




###############################################
# Models
###############################################

WorkSession = new Schema

  session_project_id:
    type: ObjectId
    required: true

  session_number:
    type: Number

  session_date_stamp:
    type: Date

  session_screen_shot:
    type: String


# Expose Activation Status
#
module.exports.WorkSession = mongoose.model 'WorkSession', WorkSession
#module.exports.Proposal = mongoose.model 'Proposal', Proposal