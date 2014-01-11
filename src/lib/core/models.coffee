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
  PRINT_DENIED: [5, 'print denied']
  PAYED: [6, 'print accepted']
  PRINTING: [7, 'printing']
  PRINTED: [8, 'printed']
  SHIPPING: [9, 'shipping']
  ARCHIVED: [10, 'archived']


###############################################
# Models
###############################################


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
    default: 1.04
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

  bad:
    type: Boolean
    default: false


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
    3: [PROJECT_STATUSES.PRINT_ACCEPTED[0], PROJECT_STATUSES.PRINT_DENIED[0]]
    4: [PROJECT_STATUSES.PAYED[0]]
    5: [PROJECT_STATUSES.PROCESSING[0], PROJECT_STATUSES.PROCESSED[0]]
    6: [PROJECT_STATUSES.PRINTING[0]]
    7: [PROJECT_STATUSES.PRINTED[0]]
    8: [PROJECT_STATUSES.SHIPPING[0]]

  return value in states[@status]

STLProject.pre 'save', (next) ->
  @editable = @status in [PROJECT_STATUSES.PROCESSED[0], PROJECT_STATUSES.PRINT_DENIED[0]]
  next()


module.exports.STLProject = mongoose.model 'STLProject', STLProject


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

