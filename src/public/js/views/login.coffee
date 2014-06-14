$(document).ready ->
  loginForm = $('#loginForm')

  loginValidator = new Validator loginForm,
    '#username':
      regexp:
        test: /^[a-z0-9_-]{3,16}$/
        message: "Invalid username."
    '#password':
      regexp:
        test: /^[a-zA-Z]\w{3,14}$/
        message: "Should contains from 4 to 15, letters(uppercase, downcase), digits, first should be a letter."

  loginForm.on 'error', (form, element, message) ->
    # improving error fields
    element.siblings('.help-block').remove()  # previous messages remove
    element.after $('<span>').addClass('help-block').text(message)
    element.parent().addClass('has-error')
