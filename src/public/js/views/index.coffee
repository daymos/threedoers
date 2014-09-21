$(document).ready ->

  CSRF_HEADER = "X-CSRF-Token"

  setCSRFToken = (securityToken) ->
    jQuery.ajaxPrefilter (options, _, xhr) ->
      xhr.setRequestHeader CSRF_HEADER, securityToken  unless xhr.crossDomain


  setCSRFToken $("meta[name=\"csrf-token\"]").attr("content")

  # Set fieldname
  $.ajaxUploadSettings.name = "thumbnail"

  # Set promptzone
  $("#manager-clickable").ajaxUploadPrompt
    url: "/filemanager/upload"

    error: ->
      alert("error uploading file")

    success: (data) ->
      if data.errors
        for k, v of object
          alert("#{k}: #{v}")
      else
        location.href = data.redirectTo

