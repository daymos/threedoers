updateFrontEnd = (data) ->
  for key of data
    element = $("##{key}")
    if element.length == 1
      element.text(data[key])

    if key == 'status'
      if data[key] == 'processing'
        $('h4.media-heading').addClass('hide')
      else
        $('h4.media-heading').removeClass('hide')

$(document).ready ->
  socket = io.connect("/project?project=#{project}")

  socket.on 'error', (data) ->
    console.log data.msg

  socket.on 'update', (data) ->
    console.log data
    updateFrontEnd(data)

  unless Modernizr.canvas
    $("#message-canvas").removeClass('hide')

  viewer = new JSC3D.Viewer $('#cv').get(0)
  viewer.setParameter 'SceneUrl', "/#{filename}"
  viewer.setParameter 'ModelColor', '#CAA618'
  viewer.setParameter 'BackgroundColor1', '#E5D7BA'
  viewer.setParameter 'BackgroundColor2', '#383840'
  viewer.setParameter 'RenderMode', 'smooth'
  viewer.init()
  viewer.update()

