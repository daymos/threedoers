updateFrontEnd = (data) ->
  for key of data
    element = $("##{key}")
    if element.length == 1
      element.text(data[key])

    if key == 'status'
      if data[key] == 'processing'
        $('.object-volume').addClass('hide')
        $('.processing-volume').removeClass('hide')
      else
        $('.object-volume').removeClass('hide')
        $('.processing-volume').addClass('hide')

    if key == 'order'
      $('#order-placed-order').text(data[key].price)


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

  ###
  # Some cool looks and feel
  ###

  $('.selectpicker').selectpicker()

  unless Modernizr.canvas
    $("#message-canvas").removeClass('hide')


  ###
  # JSC3D.Viewer
  ###

  viewer = new JSC3D.Viewer $('#cv').get(0)
  viewer.setParameter 'SceneUrl', "/#{project.filename}"
  viewer.setParameter 'ModelColor', "#{colors[project.color]}"
  viewer.setParameter 'BackgroundColor1', '#E5D7BA'
  viewer.setParameter 'BackgroundColor2', '#383840'
  viewer.setParameter 'RenderMode', 'smooth'
  viewer.setParameter 'Definition','high'
  viewer.init()
  viewer.update()

  ###
  # Some controllers
  ###

  $("#color-chooser").selectpicker('val', "#{project.color}")
  $("#color-chooser").val("#{project.color}").change(->
    $.post("/project/color/#{project.id}", value: $(this).val(), -> location.reload())
  )


  $("#density-chooser").selectpicker('val', "#{project.density}")
  $("#density-chooser").val("#{project.density}").change(->
    $.post("/project/density/#{project.id}", value: $(this).val())
  )

  $("#title").editable(
    type: 'text'
    pk: "#{project.id}"
    url: '/project/title'
  )

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
        template = "<li class='list-group-item'>
              <div class='row'>
                <div class='col-xs-2 col-md-1'><img src='http://placehold.it/80' alt='' class='img-circle img-responsive'></div>
                <div class='col-xs-10 col-md-11'>
                  <div>
                    <div class='mic-info'>By: &nbsp; &nbsp;<a href='#'>#{data.username}</a>&nbsp;on #{Date(data.createdAt)}</div>
                  </div><br>
                  <div class='comment-text'>#{safe_tags_replace(data.content)}</div>
                </div>
              </div>
            </li>"

        $("#comment-list").append($(template))
        $("#comment-text").val("")  # cleaning the textarea

      statusCode:
        400: (data) ->
          data = JSON.parse(data.responseText)
          alert(data.msg)
