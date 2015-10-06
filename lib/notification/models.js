(function() {

  var mNotification = require('models/notification');
  var NOTIFICATION_STATE = require('utils/constants').NOTIFICATION_STATE;

  module.exports.NOTIFICATION_STATE = NOTIFICATION_STATE;
  module.exports.Notification = mNotification;

}).call(this);
