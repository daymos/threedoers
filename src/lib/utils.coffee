module.exports.cloneObject = (object) ->
  newObject = {}
  newObject[key] = value  for own key, value of object
  newObject


module.exports.sendNotification = (io, users, message, title, type) ->
  for user in users
    io.of('/notification').in("notification-#{user._id.toHexString()}").emit 'new', {message: message, type: type, title: title}
