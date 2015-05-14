$(document).ready ->
  form = $('#registration')

  validator = new Validator form,
    '#address':
      required: true

  form.on 'error', (form, element, message) ->
    # improving error fields
    element.siblings('.help-block').remove()  # previous messages remove
    element.parent().append $('<span>').addClass('help-block').text(message)
    element.closest('.form-group').addClass('has-error')

  form.on 'valid', (form, element, message) ->
    # improving error fields
    element.siblings('.help-block').remove()
    element.closest('.form-group').removeClass('has-error')

  # Google autocomplete
  $input = $('#address').bind 'keypress', (e) ->
    e.preventDefault() if ( e.which == 13 )

  $input.val("#{address}")  # set empty to allow user to enter address again to get data
  searchAddressBox = new google.maps.places.Autocomplete($input.get(0))

  google.maps.event.addListener searchAddressBox, 'place_changed', ->
    place = searchAddressBox.getPlace()
    city = no
    country = no
    point = no

    for component in place.address_components
      if component.types[0] == 'locality'
        city = component.long_name
      if component.types[0] == 'country'
        country = component.long_name

    if place.geometry and place.geometry.location
      point = [place.geometry.location.lng(), place.geometry.location.lat()]

    if city and country and point
      $('#city').val(city)
      $('#country').val(country)
      $('#location').val(point)
    else
      $input.siblings('.help-block').remove()  # previous messages remove
      $input.parent().append $('<span>').addClass('help-block').text("Is not a valid address.")
      $input.closest('.form-group').addClass('has-error')


  CSRF_HEADER = "X-CSRF-Token"

  setCSRFToken = (securityToken) ->
    jQuery.ajaxPrefilter (options, _, xhr) ->
      xhr.setRequestHeader CSRF_HEADER, securityToken  unless xhr.crossDomain


  setCSRFToken $("meta[name=\"csrf-token\"]").attr("content")

  # Set fieldname
  $.ajaxUploadSettings.name = "photo"

  # Set promptzone
  $("#clickable").ajaxUploadPrompt
    url: "/accounts/user/photo/upload"

    error: ->
      html = '<br><div class="alert alert-danger"><strong>Error</strong> uploading your file, please try again.</div>'
      $("#result").html html

    success: (data) ->
      location.reload()

  $("a.remove-shipping-address").click (e) ->
    e.preventDefault()
    $.ajax
      url: $(this).attr("href")
      method: "post"

      success: () ->
        window.location.reload()

      statusCode:
        400: (data) ->
          alert(data.msg)
          location.reload(true)

  $("a.activate-shipping-address").click (e) ->
    e.preventDefault()
    $.ajax
      url: $(this).attr("href")
      method: "post"

      success: () ->
        window.location.reload()

      statusCode:
        400: (data) ->
          alert(data.msg)
          location.reload(true)
