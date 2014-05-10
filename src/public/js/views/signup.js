(function() {
  $(document).ready(function() {
    var $input, form, searchAddressBox, validator;
    form = $('#registration');
    validator = new Validator(form, {
      '#username': {
        regexp: {
          test: /^[a-z0-9_-]{3,16}$/,
          message: "Invalid username."
        }
      },
      '#password': {
        regexp: {
          test: /^[a-zA-Z]\w{3,14}$/,
          message: "Should contains from 4 to 15, letters(uppercase, downcase), digits, first should be a letter."
        }
      },
      '#email': {
        required: true
      },
      '#passwordConfirm': {
        regexp: {
          test: /^[a-zA-Z]\w{3,14}$/,
          message: "Should contains from 4 to 15, letters(uppercase, downcase), digits, first should be a letter."
        },
        match: {
          test: '#password',
          message: "Passwords didn't match"
        }
      },
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
    $input.val('');
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
