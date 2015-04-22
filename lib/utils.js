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

  module.exports.sendNotification = function(io, users, message, title, type) {
    var user, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = users.length; _i < _len; _i++) {
      user = users[_i];
      _results.push(io.of('/notification')["in"]("notification-" + (user._id.toHexString())).emit('new', {
        message: message,
        type: type,
        title: title
      }));
    }
    return _results;
  };

}).call(this);
