$(document).ready ->
  unless Modernizr.canvas
    $("#message-canvas").removeClass('hide')

  viewer = new JSC3D.Viewer $('#cv').get(0)
  viewer.setParameter 'SceneUrl', "/project/files/#{filename}"
  viewer.setParameter 'ModelColor', '#CAA618'
  viewer.setParameter 'BackgroundColor1', '#E5D7BA'
  viewer.setParameter 'BackgroundColor2', '#383840'
  viewer.setParameter 'RenderMode', 'smooth'
  viewer.init()
  viewer.update()

