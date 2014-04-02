mongoose = require 'mongoose'
gridfs = require '../gridfs'

Schema = mongoose.Schema
ObjectId = Schema.ObjectId


###############################################
# Constants
###############################################

module.exports.PROJECT_STATUSES = PROJECT_STATUSES =
  PROCESSING: [1, 'processing']
  PROCESSED: [2, 'processed']
  PRINT_REQUESTED: [3, 'print requested']
  PRINT_ACCEPTED: [4, 'print accepted']
  PAYED: [5, 'payed']
  PRINTING: [6, 'printing']
  PRINTED: [7, 'printed']
  SHIPPING: [8, 'shipping']
  ARCHIVED: [9, 'archived']

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
  COMPLETE: [1, 'complete']

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

  volume:
    type: Number

  density:
    type: Number
    default: PROJECT_DENSITIES.COMPLETE[0]
    required: true

  weight:
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

  order:
    type: {}

  comments:
    type: [Comment]



STLProject.methods.addFile = (file, options) ->
  name = file.path.split('/').pop()
  gridfs.putFile(file.path, name, options).then (doc) =>
    @file = doc.filename

STLProject.methods.humanizedStatus = ->
  for key of PROJECT_STATUSES
    if PROJECT_STATUSES[key][0] == @status
      return PROJECT_STATUSES[key][1]

STLProject.methods.validateNextStatus = (value) ->
  # creating simple state machine, state and allowed next states
  states =
    1: [PROJECT_STATUSES.PROCESSED[0]]
    2: [PROJECT_STATUSES.PROCESSING[0], PROJECT_STATUSES.PRINT_REQUESTED[0]]
    3: [PROJECT_STATUSES.PRINT_ACCEPTED[0]]
    4: [PROJECT_STATUSES.PAYED[0]]
    5: [PROJECT_STATUSES.PRINTING[0]]
    6: [PROJECT_STATUSES.PRINTED[0]]
    7: [PROJECT_STATUSES.SHIPPING[0]]

  return value in states[@status]

STLProject.methods.validNextStatus = ->
  # creating simple state machine, state and allowed next states
  states =
    1: [PROJECT_STATUSES.PROCESSED]
    2: [PROJECT_STATUSES.PROCESSING, PROJECT_STATUSES.PRINT_REQUESTED]
    3: [PROJECT_STATUSES.PRINT_ACCEPTED]
    4: [PROJECT_STATUSES.PAYED]
    5: [PROJECT_STATUSES.PRINTING]
    6: [PROJECT_STATUSES.PRINTED]
    7: [PROJECT_STATUSES.SHIPPING]

  return states[@status]

STLProject.pre 'save', (next) ->
  # only editable at this points, only status should be edited later
  @editable = @status in [PROJECT_STATUSES.PROCESSED[0]]
  next()


module.exports.Subscription = mongoose.model 'Subscription', Subscription

module.exports.STLProject = mongoose.model 'STLProject', STLProject


module.exports.STLProject.schema.path('color').validate( (value) ->
  return true unless value?  # allowing empty
  return /black|white|yellow|red|blue|green/i.test(value)
, 'Invalid Color')

module.exports.STLProject.schema.path('density').validate( (value) ->
  return true unless value?  # allowing empty
  return value in [PROJECT_DENSITIES.LOW[0], PROJECT_DENSITIES.MEDIUM[0], PROJECT_DENSITIES.HIGH[0], PROJECT_DENSITIES.COMPLETE[0], 1.04]  # 1.04 fallback for already created proejcts
, 'Invalid Density')

###
# Validations
###

module.exports.STLProject.schema.path('status').validate( (value) ->
  return @status?
  return @validateNextStatus(value)
, 'Invalid next step')

# User.path('image').set (new_value) ->
#   if new_value isnt @image
#     if @image isnt 'default_user.png'
#       console.log "delete user avatar on change: "
#       @deleteAvatars(@image)
#   return new_value




# User
#   .method 'filter', () ->
#     filtered_user = _.omit(@_doc, ['salt', 'hashed_password', 'provider', 'apn_token'])
#     filtered_user.image = "#{config.media_url}/#{@_doc.image}"
#     return filtered_user

# User.post 'remove', (doc) ->
#   if doc.image isnt 'default_user.png'
#     console.log "delete user avatar on remove: "
#     @deleteAvatars(doc.image)

# User
#   .method 'deleteAvatars', (avatar) ->
#     generate2xname = (path) ->
#       name = path.substr 0, path.lastIndexOf('.')
#       extension = path.substr path.lastIndexOf('.')
#       extension = "@2x#{extension}"
#       return "#{name}#{extension}"

#     fs.unlink "#{config.media_root}/#{avatar}", (err) ->
#       if err then console.error "ERROR deleting user's avatar: ", err
#       else console.log "User's avatar deleted successfully!"
#     fs.unlink "#{config.media_root}/#{generate2xname(avatar)}", (err) ->
#       if err then console.error "ERROR deleting user's avatar: ", err
#       else console.log "User's avatar deleted successfully!"

