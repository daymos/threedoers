class Validator
  ######################################
  # Validator needs Jquery
  #
  # This will handle most common validators for iMake
  # now are simplest ones.
  ######################################

  constructor: (@form, @validations) ->
    ######################################
    # Constructor needs form to be validated
    # also a JSON object with jquery selectors
    # as keys and an JSON object with validatons
    # required to pass before submit.
    ######################################
    @form = $(@form)  # forcing jquery function

    # now binding events
    @form.submit (event) =>
      return @validate()

  #############
  # Validators
  #############

  _required: ($element, options) ->
    val = $element.val()
    label = $element.siblings('label').text() # getting siblings label
    @message = "#{label} is required"
    @formMessage = "This field is required."
    return if val then true else false

  #############
  # End Validators
  #############

  validate: ->
    result = true
    for selector of @validations
      $element = @form.find selector
      for method of @validations[selector]
        if @["_#{method}"]
          unless @["_#{method}"]($element, @validations[selector][method])
            @form.trigger 'error', [$element, @message, @formMessage]
            result = false
            break
        else
          @form.trigger 'error', [$element, "Validator '#{method}' is not implemented"]
          result = false
    return result

this.Validator = Validator