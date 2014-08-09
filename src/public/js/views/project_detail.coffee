updateFrontEnd = (data) ->
  for key of data
    element = $("##{key}")
    if element.length == 1
      element.text(" #{data[key]}")

    if key == 'status'
      if data[key] == 'processing'
        $('.object-volume').addClass('hide')
        $('.processing-volume').removeClass('hide')
      else
        $('.object-volume').removeClass('hide')
        $('.processing-volume').addClass('hide')

    if key == 'order'
      $('#order-placed-order').text(" #{data[key].price}")


colors =
  black: '#000000'
  white: '#FFFFFF'
  red: '#FF0000'
  green: '#00FF00'
  blue: '#0000FF'
  yellow: '#FFFF00'


replaceTag = (tag) ->
  tagsToReplace[tag] or tag

safe_tags_replace = (str) ->
  str.replace /[&<>]/g, replaceTag

tagsToReplace =
  "&": "&amp;"
  "<": "&lt;"
  ">": "&gt;"

$(document).ready ->
  ###
  # CSRF Protection
  ###
  CSRF_HEADER = "X-CSRF-Token"

  setCSRFToken = (securityToken) ->
    jQuery.ajaxPrefilter (options, _, xhr) ->
      xhr.setRequestHeader CSRF_HEADER, securityToken  unless xhr.crossDomain


  setCSRFToken $("meta[name=\"csrf-token\"]").attr("content")

  ###
  # Socket IO
  ###

  socket = io.connect(":#{port}/project?project=#{project.id}")

  socket.on 'error', (data) ->
    console.log data.msg

  socket.on 'update', (data) ->
    socket.emit 'order-price', {ammount: $("#ammount").val()}
    updateFrontEnd(data)

  socket.on 'update-price-order', (data) ->
    $('#order-price').text(data.price)

  unless Modernizr.canvas
    $("#message-canvas").removeClass('hide')


  ###
  # JSC3D.Viewer
  ###

  viewer = new JSC3D.Viewer $('#cv').get(0)
  viewer.setParameter 'SceneUrl', "/#{project.filename}"
  viewer.setParameter 'ModelColor', "#{colors[project.color]}"
  viewer.setParameter 'BackgroundColor1', '#E5D7BA'
  viewer.setParameter 'InitRotationX', '25'
  viewer.setParameter 'InitRotationY', '25'
  viewer.setParameter 'InitRotationZ', '25'
  viewer.setParameter 'BackgroundColor2', '#383840'
  viewer.setParameter 'RenderMode', 'smooth'
  viewer.setParameter 'Definition','high'
  viewer.setParameter 'MipMapping','on'
  viewer.setParameter 'CreaseAngle', '30'
  viewer.init()
  viewer.update()

  ###
  # Some controllers
  ###

  $("#color-chooser").val("#{project.color}")
  $("#color-chooser").val("#{project.color}").change(->
    $.post("/project/color/#{project.id}", value: $(this).val(), -> location.reload())
  )


  $("#density-chooser").val("#{project.density}")
  $("#density-chooser").val("#{project.density}").change(->
    $.post("/project/density/#{project.id}", value: $(this).val())
  )

  $("#title").editable("/project/title/#{project.id}")

  $("#ammount").keyup( (event) ->
    if (/\D/g.test(@value) or /^0$/.test(@value))
      # Filter non-digits from input value.
      @value = @value.replace(/\D/g, '')
      @value = @value.replace(/^0$/, '')

    if /^[1-9][0-9]*$/.test(@value) or /^\s*$/.test(@value)
      $("#order-price").text("Processing")
      socket.emit 'order-price', {ammount: $("#ammount").val()}
    else
      event.preventDefault()
  )

  $("#comment-button").click (e) ->
    e.preventDefault()
    $.ajax
      url: "/project/comment/#{project.id}"
      method: "post"
      dataType: "json"
      data: {message: $("#comment-text").val()}

      success: (data) ->
        template = "<div class='media'><a href='#' class='pull-left'><img src='/#{data.photo}' alt='' class='media-object' height='78' width='78'></a>
              <div class='media-body'>
                <p>#{safe_tags_replace(data.content)}</p>
              </div>
              <div class='media-meta'>by <span class='author'>#{data.username}</span> <span class='date'>#{Date(data.createdAt)}</span></div>
            </div>"

        $("#comment-list").append($(template))
        $("#comment-text").val("")  # cleaning the textarea

      statusCode:
        400: (data) ->
          data = JSON.parse(data.responseText)
          alert(data.msg)
