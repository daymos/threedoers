updateFrontEnd = (data) ->
  for key of data
    element = $("##{key}")
    if element.length == 1
      element.text(" #{data[key]}")

    if key == 'status'
      if data[key] == 'processing'
        $('.object-volume-unit').addClass('hide')
        $('.object-volume').text('processing')
      else
        $('.object-volume-unit').removeClass('hide')
        $('#order-button').prop('disabled', false)

    if key == 'order'
      $('#order-placed-order').text(" #{data[key].price}  ")

    if key == 'status_image'
      $('#status-image').attr("src", "/img/icons_#{data[key]}_second.png")


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

address = null
shippingRate = null
shippingMethod = null

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
  try
    # user
    socket_project = io.connect(":#{port}/project", { query: 'project=' + project.id})
  catch e
    console.log { query: {project: window.location.pathname.split( '/' ).pop()} }
    socket_project = io.connect(":#{port}/project",{ query: 'project='+window.location.pathname.split( '/' ).pop()})

  socket_project.on 'error', (data) ->
    console.log data.msg

  socket_project.on 'update', (data) ->
    socket_project.emit 'order-price', {ammount: $("#ammount").val()}
    updateFrontEnd(data)

  socket_project.on 'update-price-order', (data) ->
    $('#order-price').text(data.price)

  unless Modernizr.canvas
    $("#message-canvas").removeClass('hide')


  ###
  # JSC3D.Viewer
  ###
  if $('#cv').get(0)
    viewer = new JSC3D.Viewer $('#cv').get(0)
    viewer.setParameter 'SceneUrl', "/#{project.filename}"
    viewer.setParameter 'ModelColor', "#{colors[project.color]}"
    viewer.setParameter 'BackgroundColor1', '#E5D7BA'
    # viewer.setParameter 'InitRotationX', '25'
    # viewer.setParameter 'InitRotationY', '25'
    # viewer.setParameter 'InitRotationZ', '25'
    viewer.setParameter 'BackgroundColor2', '#383840'
    viewer.setParameter 'RenderMode', 'smooth'
    viewer.setParameter 'Definition','high'
    viewer.setParameter 'MipMapping','on'
    viewer.setParameter 'CreaseAngle', '30'
    # viewer.setMouseUsage 'default'
    # viewer.enableDefaultInputHandler(true)
    viewer.onloadingcomplete = ->
      unless project.hasImage
        # we need to render the image before update project
        setTimeout(->
          $.post("/project/#{ project.id }/image/", {image: $("#cv")[0].toDataURL()})
        , 15000 # 10 sec
        )

    viewer.init()
    viewer.update()

  ###
  # Some controllers
  ###

  $("#color-chooser").val("#{project.color}")
  $("#color-chooser").val("#{project.color}").change(->
    $.post("/project/color/#{project.id}", value: $(this).val(), -> location.reload())
  )


  $("#material-chooser").val("#{project.material}")
  $("#material-chooser").val("#{project.material}").change(->
    $.post("/project/material/#{project.id}", value: $(this).val())
  )

  $("#title").editable("/project/title/#{project.id}")

  $("#ammount").keyup( (event) ->
    if (/\D/g.test(@value) or /^0$/.test(@value))
      # Filter non-digits from input value.
      @value = @value.replace(/\D/g, '')
      @value = @value.replace(/^0$/, '')

    if /^[1-9][0-9]*$/.test(@value) or /^\s*$/.test(@value)
      $("#order-price").text("Processing")
      socket_project.emit 'order-price', {ammount: $("#ammount").val()}
    else
      event.preventDefault()
  )

  prettyDate = (dateString) ->
    date = new Date(dateString);
    d = date.getDate();
    monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
    m = monthNames[date.getMonth()];
    y = date.getFullYear();
    h = date.getHours()
    mm = date.getMinutes()
    return d+'/'+m+'/'+y;


  prettyHour = (dateString) ->
    date = new Date(dateString);
    d = date.getDate();
    monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
    m = monthNames[date.getMonth()];
    y = date.getFullYear();
    h = date.getHours()
    mm = date.getMinutes()
    return h+':'+mm;

  $("#comment-button").click (e) ->
    e.preventDefault()
    $.ajax
      url: "/project/comment/#{project.id}"
      method: "post"
      dataType: "json"
      data: {message: $("#comment-text").val()}

      success: (data) ->

        template = "<div class='mine-chat media'>
          <div class='media-body text-right'>
            <div class='message'>#{safe_tags_replace(data.content)}</div>
            <p class='meta'> By<strong> you</strong> at<strong> #{prettyDate(data.createdAt)}</strong> at<strong> #{prettyHour(data.createdAt)} pm</strong></p>
          </div>
          <div class='media-right'><a href='#'><img src='/#{data.photo}' style='width:50px; height:50px' class='media-object'></a></div>
        </div>"

        $("#comment-list").append($(template))
        $("#comment-text").val("")  # cleaning the textarea

      statusCode:
        400: (data) ->
          data = JSON.parse(data.responseText)
          alert(data.msg)

  # this code is for payment process
  updatePayDiv = ->
    if address
      $.ajax
        url: "/validate-address-and-rate/#{ project.id }"
        data: address
        dataType: 'json'
        success: (data) ->
          if data.errors
            for error of data.errors
              alert("#{data.errors[error].param}: #{data.errors[error].msg}")

          if data.message
            alert(data.message)

          if data.ok
            address = data.address
            shippingRate = parseFloat(data.charge)
            $('#address-selection').hide()
            $('#pay-values').show()
            $('#pay-product-price').html("#{ project.orderPrice }")
            $('#pay-shipping-price').html("#{ shippingRate }")
            $('#pay-total-price').html("#{ (project.orderPrice + shippingRate).toFixed(2) }")
          else
            alert("Something was wrong please try again.")
        error: ->
          alert("Something was wrong please try again.")
    else
      alert("Please select and address or add new one.")

  $('a.select-saved-address').click (event) ->
    event.preventDefault()

    address =
      id: $(@).attr('data-id')

    updatePayDiv()

  $('button#validate-address').click (event) ->
    event.preventDefault()

    address = {}
    a = $(@).closest('form').serializeArray()
    $.each a, ->
      if address[@name]
        address[@name] = [address[@name]]  unless address[@name].push
        address[@name].push @value or ""
      else
        address[@name] = @value or ""
      return
    updatePayDiv()

  $('#payment-form').submit (event) ->
    event.preventDefault()
    $form = $('#payment-form')
    shippingMethod = 'shipping' # $form.find('input[name=shipping]:checked').val()

    if shippingMethod == 'shipping'
      $('#payment-modal').modal('show')
    else
      $("#hidden-pay-form #shippingMethod").val(shippingMethod)
      $("#hidden-pay-form").submit()

  $('.close-payment-modal').click (event) ->
    $('#payment-modal').modal('hide')

  # cleaning values on cancel
  $('#payment-modal').on 'hidden.bs.modal', (event) ->
    $('#address-selection').show()
    $('#pay-values').hide()
    address = null
    shippingMethod = null
    shippingRate = null

  $('#pay-payment-modal').click (event) ->
    $("#hidden-pay-form #shippingRate").val(shippingRate)
    $("#hidden-pay-form #shippingMethod").val(shippingMethod)
    $("#hidden-pay-form #shippingAddress").val(JSON.stringify(address))
    $("#hidden-pay-form").submit()

  $('#printer-input').val('').blur( ->
      active = $("#printer-input").typeahead("getActive")
      if active
        $('#printer-input').val("#{ active.username }")
        $('#printer-input').closest('div').append("<span class='glyphicon glyphicon-ok form-control-feedback' aria-hidden='true'></span>")
  )
  $('#printer-input').typeahead({
    delay: 300
    source: (query, process) ->
      active = $("#printer-input").typeahead("getActive")
      unless active and "#{ active.username }" == query
        $.get("/api/printers?q=#{query}").done (data, status, xhr) ->
          process data
          $('#printer-input').closest('div').find('.glyphicon').remove()
    matcher: (item) ->
      ~( item.username.toLowerCase().indexOf(this.query.toLowerCase()) and item.email.toLowerCase().indexOf(this.query.toLowerCase()) )
    afterSelect: ->
      $('#printer-input').closest('div').append("<span class='glyphicon glyphicon-ok form-control-feedback' aria-hidden='true'></span>")
      active = $("#printer-input").typeahead("getActive")
      $('#printer-hidden').val(active._id)
    displayText: (item) ->
      return "#{ item.username }"
  })
