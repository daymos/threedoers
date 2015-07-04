$(document).ready ->
  try

    $.get('/getMessageNotifications')
    .done( (response) ->
      try
        if response.notifications.length != 0
          $('.message-notifications img').prop("src", "/images/chat_notify.png")
        else
          $('.message-notifications img').prop("src", "/images/chat_normal.png")
      catch e
        console.log e
    )
    .fail ->
      console.log "error"

    $.post('/getNotifications')
    .done( (response) ->
      try
        if response.notifications.length != 0
          $('#notifID').addClass("fluo-3doers")
      catch e
        console.log e
    )
    .fail ->
      console.log "error"

    $('#list-group-notif').click ->
      $.post('/notification/read/'+event.target.id)
      .done( (response) ->
        console.log "read "+response
      ).fail ->
        console.log "error"
  catch  e
    console.log e
