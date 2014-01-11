(function() {
  $(document).ready(function() {
    var loginForm, loginValidator;
    loginForm = $('#loginForm');
    loginValidator = new Validator(loginForm, {
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
      }
    });
    return loginForm.on('error', function(form, element, message) {
      element.siblings('.help-block').remove();
      element.after($('<span>').addClass('help-block').text(message));
      return element.parent().addClass('has-error');
    });
  });

}).call(this);
