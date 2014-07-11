(function() {
  $(document).ready(function() {
    var $input, form, searchAddressBox, validator;
    form = $('#registration');
    validator = new Validator(form, {
      '#address': {
        required: true
      }
    });
    form.on('error', function(form, element, message) {
      element.siblings('.help-block').remove();
      element.parent().append($('<span>').addClass('help-block').text(message));
      return element.closest('.form-group').addClass('has-error');
    });
    form.on('valid', function(form, element, message) {
      element.siblings('.help-block').remove();
      return element.closest('.form-group').removeClass('has-error');
    });
    $input = $('#address').bind('keypress', function(e) {
      if (e.which === 13) {
        return e.preventDefault();
      }
    });
    $input.val("" + address);
    searchAddressBox = new google.maps.places.Autocomplete($input.get(0));
    return google.maps.event.addListener(searchAddressBox, 'place_changed', function() {
      var city, component, country, place, point, _i, _len, _ref;
      place = searchAddressBox.getPlace();
      city = false;
      country = false;
      point = false;
      _ref = place.address_components;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        component = _ref[_i];
        if (component.types[0] === 'locality') {
          city = component.long_name;
        }
        if (component.types[0] === 'country') {
          country = component.long_name;
        }
      }
      if (place.geometry && place.geometry.location) {
        point = [place.geometry.location.lng(), place.geometry.location.lat()];
      }
      if (city && country && point) {
        $('#city').val(city);
        $('#country').val(country);
        return $('#location').val(point);
      } else {
        $input.siblings('.help-block').remove();
        $input.parent().append($('<span>').addClass('help-block').text("Is not a valid address."));
        return $input.closest('.form-group').addClass('has-error');
      }
    });
  });

}).call(this);
