mongoose = require 'mongoose'
gridfs = require '../gridfs'
inflection = require 'inflection'

Schema = mongoose.Schema
ObjectId = Schema.ObjectId

module.exports.PROJECT_STATUSES = PROJECT_STATUSES =
  UPLOADED: [1, 'uploaded']
  PREACCEPTED: [2, 'preaccepted']
  ACCEPTED: [3, 'accpeted']
  PAID: [4, 'paid']
  FINISHED: [5, 'finished']


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

  description:
    type: String
    required: true
    default: "Set the description"

  createdAt:
    type: Date
    default: Date.now


FileProject = new Schema

  title:
    type: String
    required: true
    default: "Untitled Project"

  original_file:
    type: String
    required: true

  reviewed_file:
    type: String

  image:
    type: String

  status:
    type: Number
    default: PROJECT_STATUSES.UPLOADED[0]
    required: true

  user:
    type: ObjectId
    required: true

  price:
    type: String
    required: true
    default: '15.0'

  comments:
    type: [Comment]

  filemanager:
    type:String

  createdAt:
    type: Date


FileProject.methods.humanizedStatus = ->
  for key of PROJECT_STATUSES
    if PROJECT_STATUSES[key][0] == @status
      return PROJECT_STATUSES[key][1]

FileProject.methods.dasherizedStatus = ->
  for key of PROJECT_STATUSES
    if PROJECT_STATUSES[key][0] == @status
      return inflection.dasherize(PROJECT_STATUSES[key][1]).replace('-', '_')

FileProject.methods.validateNextStatus = (value) ->
  # creating simple state machine, state and allowed next states
  states =
    1: [PROJECT_STATUSES.PREACCEPTED[0]]
    2: [PROJECT_STATUSES.ACCEPTED[0], PROJECT_STATUSES.UPLOADED[0]]
    3: [PROJECT_STATUSES.PAID[0]]
    4: [PROJECT_STATUSES.FINISHED[0]]

  return value in states[@status]

FileProject.methods.validNextStatus = ->
  # creating simple state machine, state and allowed next states
  states =
    1: [PROJECT_STATUSES.PREACCEPTED]
    2: [PROJECT_STATUSES.ACCEPTED, PROJECT_STATUSES.UPLOADED]
    3: [PROJECT_STATUSES.PAID]
    4: [PROJECT_STATUSES.FINISHED]

  return states[@status]


FileProject.pre 'save', (next) ->
  now = new Date()
  @createdAt = now  unless @createdAt
  next()


module.exports.FileProject = mongoose.model 'FileProject', FileProject

module.exports.FileProject.schema.path('status').validate( (value) ->
  return @status?
  return @validateNextStatus(value)
)
