(function() {
  var __hasProp = {}.hasOwnProperty;

  module.exports.cloneObject = function(object) {
    var key, newObject, value;
    newObject = {};
    for (key in oldObject) {
      if (!__hasProp.call(oldObject, key)) continue;
      value = oldObject[key];
      newObject[key] = value;
    }
    return newObject;
  };

}).call(this);
