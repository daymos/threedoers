$(document).ready ->
  loginForm = $('#loginForm')

  loginValidator = new Validator loginForm,
    '#username':
      required: true
    '#password':
      required: true

  loginForm.on 'error', (form, element, message, formMessage) ->
    $('.modal-alert .modal-title').text("Error");
    $('.modal-alert .modal-body p').text(message);
    $('.modal-alert').modal('show')

    # improving error fields
    element.siblings('.help-block').remove()  # previous messages remove
    element.after $('<span>').addClass('help-block').text(formMessage)
    element.parent().addClass('has-error')

  $("#loginForm #forgot-password").click ->
    $("#get-credentials").modal "show"


  # lv = new LoginValidator()
  # lc = new LoginController()

  # # main login form //
  # $("#login-form").ajaxForm
  #   beforeSubmit: (formData, jqForm, options) ->
  #     if lv.validateForm() is false
  #       false
  #     else

  #       # append 'remember-me' option to formData to write local cookie //
  #       formData.push
  #         name: "remember-me"
  #         value: $("input:checkbox:checked").length is 1

  #       true

  #   success: (responseText, status, xhr, $form) ->
  #     window.location.href = "/home"  if status is "success"

  #   error: (e) ->
  #     lv.showLoginError "Login Failure", "Please check your username and/or password"

  # $("#user-tf").focus()

  # # login retrieval form via email //
  # ev = new EmailValidator()
  # $("#get-credentials-form").ajaxForm
  #   url: "/lost-password"
  #   beforeSubmit: (formData, jqForm, options) ->
  #     if ev.validateEmail($("#email-tf").val())
  #       ev.hideEmailAlert()
  #       true
  #     else
  #       ev.showEmailAlert "<b> Error!</b> Please enter a valid email address"
  #       false

  #   success: (responseText, status, xhr, $form) ->
  #     ev.showEmailSuccess "Check your email on how to reset your password."

  #   error: ->
  #     ev.showEmailAlert "Sorry. There was a problem, please try again later."
