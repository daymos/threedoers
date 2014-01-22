$(document).ready ->

  ###
  # CSRF Protection
  ###
  CSRF_HEADER = "X-CSRF-Token"

  setCSRFToken = (securityToken) ->
    jQuery.ajaxPrefilter (options, _, xhr) ->
      xhr.setRequestHeader CSRF_HEADER, securityToken  unless xhr.crossDomain


  setCSRFToken $("meta[name=\"csrf-token\"]").attr("content")


  panels = $(".user-infos")
  panelsButton = $(".dropdown-user")
  panels.hide()
  panelsButton.click ->

    #get data-for attribute
    dataFor = $(this).attr("data-for")
    idFor = $(".#{dataFor}")

    #current button
    currentButton = $(this)
    idFor.slideToggle 400, ->

      #Completed slidetoggle
      if idFor.is(":visible")
        currentButton.html "<i class=\"glyphicon glyphicon-chevron-up text-muted\"></i>"
      else
        currentButton.html "<i class=\"glyphicon glyphicon-chevron-down text-muted\"></i>"


  $("[data-toggle=\"tooltip\"]").tooltip()

  $("button").click (e) ->
    e.preventDefault()
    $.ajax
      url: "/printing/accept/#{$(this).closest(".user-infos").attr('data-project')}"
      method: "post"
      dataType: "json"

      success: (data) ->
        alert(data.msg)
        window.location.href = "/printing/jobs"

      statusCode:
        400: (data) ->
          alert(data.msg)
          location.reload(true)


