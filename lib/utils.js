(function() {
  var __hasProp = {}.hasOwnProperty;

  module.exports.cloneObject = function(object) {
    var key, newObject, value;
    newObject = {};
    for (key in object) {
      if (!__hasProp.call(object, key)) continue;
      value = object[key];
      newObject[key] = value;
    }
    return newObject;
  };

}).call(this);
