mongoose = require 'mongoose'
gridfs = require '../gridfs'
inflection = require 'inflection'
models = require('./models')
modelsNot = require('../notification/models')

Schema = mongoose.Schema
ObjectId = Schema.ObjectId


###############################################
# Constants
###############################################

module.exports.PROJECT_STATUSES = PROJECT_STATUSES =
  PROCESSING: [1, 'processing']
  PROCESSED: [2, 'processed']
  PRINT_REQUESTED: [3, 'print requested']
  PRINT_REVIEW: [4, 'print review']
  PRINT_ACCEPTED: [5, 'print accepted']
  PAYED: [6, 'payed']
  PRINTING: [7, 'printing']
  PRINTED: [8, 'printed']
  SHIPPING: [9, 'shipping']
  ARCHIVED: [10, 'archived']

module.exports.PROJECT_COLORS = PROJECT_COLORS =
  BLACK: 'black'
  WHITE: 'white'
  YELLOW: 'yellow'
  RED: 'red'
  BLUE: 'blue'
  GREEN: 'green'

module.exports.PROJECT_DENSITIES = PROJECT_DENSITIES =
  LOW: [0.25, 'low']
  MEDIUM: [0.5, 'medium']
  HIGH: [0.75, 'high']
  COMPLETE: [1.01, 'complete']

module.exports.PROJECT_MATERIALS = PROJECT_MATERIALS =
  ABS: [1.01, 'ABS']
  PLA: [1.24, 'PLA']

###############################################
# Models
###############################################


Subscription = new Schema
  email:
    type: String
    required: true
    index:
      unique: true


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


STLProject = new Schema

  title:
    type: String
    required: true
    default: "Untitled Project"

  file:
    type: String
    required: true

  image:
    type: String

  volume:
    type: Number

  density:
    type: Number
    default: PROJECT_MATERIALS.ABS[0]
    required: true

  weight:
    type: Number

  surface:
    type: Number

  unit:
    type: String

  status:
    type: Number
    default: PROJECT_STATUSES.PROCESSING[0]
    required: true

  user:
    type: ObjectId
    required: true

  color:
    type: String
    required: true
    default: PROJECT_COLORS.WHITE

  price:
    type: String
    required: true
    default: '0.0'

  bad:
    type: Boolean
    default: false

  editable:
    type: Boolean
    default: true

  material:
    type: String
    default: "ABS"

  order:
    type: {}

  dimension:
    type: {}

  comments:
    type: [Comment]

  createdAt:
    type: Date



STLProject.methods.addFile = (file, options) ->
  name = file.path.split('/').pop()
  gridfs.putFile(file.path, name, options).then (doc) =>
    @file = doc.filename

STLProject.methods.humanizedStatus = ->
  for key of PROJECT_STATUSES
    if PROJECT_STATUSES[key][0] == @status
      return PROJECT_STATUSES[key][1]

STLProject.methods.dasherizedStatus = ->
  for key of PROJECT_STATUSES
    if PROJECT_STATUSES[key][0] == @status
      return inflection.dasherize(PROJECT_STATUSES[key][1]).replace('-', '_')

STLProject.methods.validateNextStatus = (value) ->
  # creating simple state machine, state and allowed next states
  states =
    1: [PROJECT_STATUSES.PROCESSED[0]]
    2: [PROJECT_STATUSES.PROCESSING[0], PROJECT_STATUSES.PRINT_REQUESTED[0]]
    3: [PROJECT_STATUSES.PRINT_REVIEW[0]]
    4: [PROJECT_STATUSES.PRINT_ACCEPTED[0], PROJECT_STATUSES.PRINT_REQUESTED[0]]
    5: [PROJECT_STATUSES.PAYED[0]]
    6: [PROJECT_STATUSES.PRINTING[0]]
    7: [PROJECT_STATUSES.PRINTED[0]]
    8: [PROJECT_STATUSES.SHIPPING[0], PROJECT_STATUSES.ARCHIVED[0]]
    9: [PROJECT_STATUSES.ARCHIVED[0]]

  return value in states[@status]

STLProject.methods.validNextStatus = ->
  # creating simple state machine, state and allowed next states
  states =
    1: [PROJECT_STATUSES.PROCESSED]
    2: [PROJECT_STATUSES.PROCESSING, PROJECT_STATUSES.PRINT_REQUESTED]
    3: [PROJECT_STATUSES.PRINT_REVIEW]
    4: [PROJECT_STATUSES.PRINT_ACCEPTED, PROJECT_STATUSES.PRINT_REQUESTED]
    5: [PROJECT_STATUSES.PAYED]
    6: [PROJECT_STATUSES.PRINTING]
    7: [PROJECT_STATUSES.PRINTED]
    8: [PROJECT_STATUSES.SHIPPING, PROJECT_STATUSES.ARCHIVED]
    9: [PROJECT_STATUSES.ARCHIVED]

  return states[@status]

STLProject.pre 'save', (next) ->
  # only editable at this points, only status should be edited later
  @editable = @status in [PROJECT_STATUSES.PROCESSED[0], PROJECT_STATUSES.PRINT_REVIEW[0]]
  now = new Date()
  @createdAt = now  unless @createdAt
  that = @
  models.STLProject.findOne({_id: @id}).exec().then( (doc) ->
    if (doc.status != that.status)

      notif = new modelsNot.Notification()
      notif.type = modelsNot.NOTIFICATION_STATE.CHANGE_STATUS[0]
      notif.creator = that.id
      notif.recipient = that.user
      notif.refertourl="/project/"+that.id
      notif.save()

  )

  next()


module.exports.Subscription = mongoose.model 'Subscription', Subscription

module.exports.STLProject = mongoose.model 'STLProject', STLProject


module.exports.STLProject.schema.path('color').validate( (value) ->
  return true unless value?  # allowing empty
  return /black|white|yellow|red|blue|green/i.test(value)
, 'Invalid Color')

module.exports.STLProject.schema.path('density').validate( (value) ->
  return true unless value?  # allowing empty
  return value in [PROJECT_MATERIALS.ABS[0], PROJECT_MATERIALS.PLA[0]]
, 'Invalid Density')

###
# Validations
###

module.exports.STLProject.schema.path('status').validate( (value) ->
  return @status?
  return @validateNextStatus(value)
, 'Invalid next step')
