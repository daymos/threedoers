class Validator
  ######################################
  # Validator needs Jquery
  #
  # This will handle most common validators for 3doers
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
    @message = options.message || "This field is required."
    return if val then true else false

  _regexp: ($element, options) ->
    val = $element.val()
    label = $element.siblings('label').text() # getting siblings label
    @message = options.message || "This field is not valid."
    return if val.match(options.test) then true else false

  _match: ($element, options) ->
    val1 = $element.val()
    val2 = $(options.test).val()
    label = $element.siblings('label').text() # getting siblings label
    @message = options.message || "Value didn't match"
    return if val1 == val2 then true else false

  #############
  # End Validators
  #############

  formatOptions: (options) ->
    unless options.test
      options =
        tests: options
    options

  validate: ->
    result = true
    for selector of @validations
      $element = @form.find selector
      for method of @validations[selector]
        if @["_#{method}"]
          unless @["_#{method}"]($element, @formatOptions(@validations[selector][method]))
            @form.trigger 'error', [$element, @message]
            result = false
            break
          else
            @form.trigger 'valid', [$element]
        else
          @form.trigger 'error', [$element, "Validator '#{method}' is not implemented"]
          result = false
    return result

this.Validator = Validator