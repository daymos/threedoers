$(document).ready ->
  form = $('#registration')

  $('select#country-list').selectToAutocomplete()

  loginValidator = new Validator form,
    '#username':
      required: true
    '#password':
      required: true
      min: 6
      max: 20
    '#email':
      required: true
    '#password':
      required: true
    '#passwordConfirm':
      required: true
    '#country-list':
      required: true

  form.on 'error', (form, element, message, formMessage) ->
    # improving error fields
    element.siblings('.help-block').remove()  # previous messages remove
    element.parent().append $('<span>').addClass('help-block').text(formMessage)
    element.closest('.form-group').addClass('has-error')