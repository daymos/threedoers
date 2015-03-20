$(document).ready ->
  try
    console.log user
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