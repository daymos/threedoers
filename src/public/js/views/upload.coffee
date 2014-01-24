$(document).ready ->

  CSRF_HEADER = "X-CSRF-Token"

  setCSRFToken = (securityToken) ->
    jQuery.ajaxPrefilter (options, _, xhr) ->
      xhr.setRequestHeader CSRF_HEADER, securityToken  unless xhr.crossDomain


  setCSRFToken $("meta[name=\"csrf-token\"]").attr("content")

  # Set fieldname
  $.ajaxUploadSettings.name = "thumbnail"

  # Set promptzone
  $("#promptzone").ajaxUploadPrompt
    url: "./upload"

    beforeSend: ->
      $("#promptzone").hide()
      $(".progress-bar").parent().removeClass 'hide'

    onprogress: (e) ->
      if e.lengthComputable
        percentComplete = (e.loaded / e.total) * 100

        # Show in progressbar
        $(".progress-bar").css('width', "#{percentComplete}%")
                          .attr('aria-valuenow', "#{percentComplete}")
                          .html("#{percentComplete}% Complete")

    error: ->
      html = '<br><div class="alert alert-danger"><strong>Error</strong> uploading your file, please try again.</div>'
      $("#result").html html

    success: (data) ->
      location.href = data.redirectTo

