$(document).ready ->
  $.post('/getNotifications')
  .done( (response) ->
    if response.notifications.length == 0
      $('#notifID').hide()
  )
  .fail ->
    console.log "error"

$('#list-group-notif').click ->
  $.post('/notification/read/'+event.target.id)
  .done( (response) ->
    console.log "read "+response
  ).fail ->
    console.log "error"