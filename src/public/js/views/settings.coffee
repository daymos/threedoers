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
