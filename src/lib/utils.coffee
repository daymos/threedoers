module.exports.cloneObject = (object) ->
  newObject = {}
  newObject[key] = value  for own key, value of object
  newObject