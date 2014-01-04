(function() {
  $(document).ready(function() {
    var loginForm, loginValidator;
    loginForm = $('#loginForm');
    loginValidator = new Validator(loginForm, {
      '#username': {
        required: true
      },
      '#password': {
        required: true
      }
    });
    loginForm.on('error', function(form, element, message, formMessage) {
      $('.modal-alert .modal-title').text("Error");
      $('.modal-alert .modal-body p').text(message);
      $('.modal-alert').modal('show');
      element.siblings('.block-help').remove();
      element.after($('<span>').addClass('help-block').text(formMessage));
      return element.parent().addClass('has-error');
    });
    return $("#loginForm #forgot-password").click(function() {
      return $("#get-credentials").modal("show");
    });
  });

}).call(this);
