
$(document).ready ->
  ###
  # CSRF Protection
  ###
  CSRF_HEADER = "X-CSRF-Token"

  setCSRFToken = (securityToken) ->
    jQuery.ajaxPrefilter (options, _, xhr) ->
      xhr.setRequestHeader CSRF_HEADER, securityToken  unless xhr.crossDomain


  setCSRFToken $("meta[name=\"csrf-token\"]").attr("content")


#  $(":input").each() ->
#    if($(this).val() == "")
#      alert("Fill both parameters")
#      return
#    return
  $('#proposalForm').validate
    rules:
      hours:
        required: true,
        number: true

      cost:
        required: true,
        number: true


    submitHandler: (form) ->

      true




  $("button.fire-modal-proposal").click (event) ->
    $("form#proposalForm").attr("action","/design/proposal/"+event.target.id)
    return








