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

colors =
  black: '#000000'
  white: '#FFFFFF'
  red: '#FF0000'
  green: '#00FF00'
  blue: '#0000FF'
  yellow: '#FFFF00'

$(document).ready ->
  CSRF_HEADER = "X-CSRF-Token"

  setCSRFToken = (securityToken) ->
    jQuery.ajaxPrefilter (options, _, xhr) ->
      xhr.setRequestHeader CSRF_HEADER, securityToken  unless xhr.crossDomain


  setCSRFToken $("meta[name=\"csrf-token\"]").attr("content")

  socket = io.connect(":#{port}/project?project=#{project.id}")

  socket.on 'error', (data) ->
    console.log data.msg

  socket.on 'update', (data) ->
    updateFrontEnd(data)

  unless Modernizr.canvas
    $("#message-canvas").removeClass('hide')

  viewer = new JSC3D.Viewer $('#cv').get(0)
  viewer.setParameter 'SceneUrl', "/#{project.filename}"
  viewer.setParameter 'ModelColor', "#{colors[project.color]}"
  viewer.setParameter 'BackgroundColor1', '#E5D7BA'
  viewer.setParameter 'BackgroundColor2', '#383840'
  viewer.setParameter 'RenderMode', 'smooth'
  viewer.init()
  viewer.update()

  $("#color-chooser").val("#{project.color}").change(->
    $.post("/project/color/#{project.id}", value: $(this).val())
    viewer.setParameter 'ModelColor', "#{colors[project.color]}"
    viewer.update(false)
  )

  $("#density-chooser").val("#{project.density}").change(->
    $.post("/project/density/#{project.id}", value: $(this).val())
  )

  # $.fn.editableform.engine = 'jquery';
  $("#title").editable(
    type: 'text'
    pk: "#{project.id}"
    url: '/project/title'
  )
