(function() {
  $(document).ready(function() {
    return $.post('/getNotifications').done(function(response) {
      if (response.notifications.length !== 0) {
        return $('#notifID').addClass("fluo-3doers");
      }
    }).fail(function() {
      return console.log("error");
    });
  });

  $('#list-group-notif').click(function() {
    return $.post('/notification/read/' + event.target.id).done(function(response) {
      return console.log("read " + response);
    }).fail(function() {
      return console.log("error");
    });
  });

}).call(this);
