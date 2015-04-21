mongoose = require 'mongoose'
gridfs = require '../gridfs'
inflection = require 'inflection'
models = require('./models')
modelComment = require('../core/models')

Schema = mongoose.Schema
ObjectId = Schema.ObjectId

###############################################
# Constants
###############################################


module.exports.DESIGN_STATUSES = DESIGN_STATUSES =
  UPLOADED: [1, 'uploaded']
  ACCEPTED: [2, 'accepted']
  TIMEEEXPIRED: [3, 'time expired']
  TIMEREQUIRECONFIRM: [4, 'more time require confirmation']
  TIMEEXPIREDPROCESSED: [5, 'time expired processed']
  PAID: [6, 'payed']
  DELIVERED: [7, 'delivered']
  ARCHIVED: [8, 'archived']


###############################################
# Models
###############################################

Proposal = new Schema
  creator:
    type: ObjectId
    required: true

  username:
    type:String
    required: true

  userRate:
    type: Number
    default: 0

  timeRate:
      type: Number
      default: 0

  backref:
    type:ObjectId
    require:true

  rejected:
    type:Boolean
    default:false

  hour:
    type: Number
    required: true

  cost:
    type: Number
    required: true

  createAt:
    type: Date
    default: Date.now

  accepted:
    type:Boolean
    default:false





Comment = new Schema

  author:
    type: ObjectId
    required: true

  username:
    type: String
    required: true

  photo:
    type: String

  content:
    type: String
    required: true

  createdAt:
    type: Date
    default: Date.now


STLDesign = new Schema

  creator:
    type: ObjectId
    required: true

  title:
    type: String
    required: true

  abstract:
    type: String
    required: true

  description:
    type: String

  order:
    type:{}

  status:
    type: Number
    default: DESIGN_STATUSES.UPLOADED[0]
    required: true

  proposal:
    type:[Proposal]

  createAt:
    type: Date
    default: Date.now

  comments:
    type: [Comment]

  designer:
    type: String

  project_total_time_logged:
    type: Number
    default: 0

  resources:
    type: [String]
    require: true

  final_stl:
    type: String
  rate:
    type: Number

  additionalHourRequested:
    type:Number
    default:null

  proposalSelected:
      type: Boolean
      default:false




STLDesign.methods.humanizedStatus = ->
  for key of DESIGN_STATUSES
    if DESIGN_STATUSES[key][0] == @status
      return DESIGN_STATUSES[key][1]

STLDesign.methods.dasherizedStatus = ->
  for key of DESIGN_STATUSES
    if DESIGN_STATUSES[key][0] == @status
      return inflection.dasherize(DESIGN_STATUSES[key][1]).replace('-', '_')

#Proposal.pre 'save', (next) ->
#  that = @
#  models.STLDesign.findOne({_id: @backref}).exec().then( (doc) ->
#    i = 0
#    while i < doc.proposal.length
#      if (Boolean 'doc.proposal[i].accepted' != Boolean 'that.accepted' and doc.proposal[i]._id == that._id)
#        if doc.proposal[i].accepted
#          console.log "Set propasal rejected for"+doc.proposal[i]._id
#          doc.proposal[i].rejected = true
#        doc.proposal[i].accepted = that.accepted
#        doc.save()
#        i++
#      else
#        i++
#
#  )
#
#  next()

# Expose Activation Status
module.exports.STLDesign = mongoose.model 'STLDesign', STLDesign
module.exports.Proposal = mongoose.model 'Proposal', Proposal