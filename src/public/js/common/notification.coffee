$(document).ready ->
  ###
  # Socket IO
  ###
  try
    if user.id
      socket = io.connect(":#{port}/notification", {query: "user=#{user.id}#{ if (project?) then '&project=' + project.id else ''}"})

      socket.on 'new', (data) ->
        $.growl
          title: "#{data.title || ''}<br>"
          message: data.message
        ,
          type: data.type
  catch e
    console.log e
