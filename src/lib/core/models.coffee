mongoose = require 'mongoose'
gridfs = require '../gridfs'

Schema = mongoose.Schema
ObjectId = Schema.ObjectId


STLProject = new Schema

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

  processed:
    type: Boolean
    default: false
    required: true

  user:
    type: ObjectId
    required: true


STLProject.methods.addFile = (file, options) ->
  name = file.path.split('/').pop()
  gridfs.putFile(file.path, name, options).then (doc) =>
    @file = doc.filename


module.exports.STLProject = mongoose.model 'STLProject', STLProject

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

