(function() {
  $(document).ready(function() {
    var e;
    try {
      $.get('/getMessageNotifications').done(function(response) {
        var e;
        try {
          if (response.notifications.length !== 0) {
            return $('.message-notifications img').prop("src", "/images/chat_notify.png");
          } else {
            return $('.message-notifications img').prop("src", "/images/chat_normal.png");
          }
        } catch (_error) {
          e = _error;
          return console.log(e);
        }
      }).fail(function() {
        return console.log("error");
      });
      $.post('/getNotifications').done(function(response) {
        var e;
        try {
          if (response.notifications.length !== 0) {
            return $('#notifID').addClass("fluo-3doers");
          }
        } catch (_error) {
          e = _error;
          return console.log(e);
        }
      }).fail(function() {
        return console.log("error");
      });
      return $('#list-group-notif').click(function() {
        return $.post('/notification/read/' + event.target.id).done(function(response) {
          return console.log("read " + response);
        }).fail(function() {
          return console.log("error");
        });
      });
    } catch (_error) {
      e = _error;
      return console.log(e);
    }
  });

}).call(this);
