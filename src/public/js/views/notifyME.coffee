$(document).ready ->
  console.log "Getting notification"
  $.post('/getNotifications')
  .done( (response) ->
    console.log response.notifications
    if response.notifications.length == 0
      $('#notifID').hide()
  )
  .fail ->
    console.log "MISERABLE"

