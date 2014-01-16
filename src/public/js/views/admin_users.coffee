$(document).ready ->

  CSRF_HEADER = "X-CSRF-Token"

  setCSRFToken = (securityToken) ->
    jQuery.ajaxPrefilter (options, _, xhr) ->
      xhr.setRequestHeader CSRF_HEADER, securityToken  unless xhr.crossDomain


  setCSRFToken $("meta[name=\"csrf-token\"]").attr("content")

  panels = $(".user-infos")
  panelsButton = $(".dropdown-user")
  panels.hide()

  #Click dropdown
  panelsButton.click ->

    #get data-for attribute
    dataFor = $(this).attr("data-for")
    idFor = $(dataFor)

    #current button
    currentButton = $(this)
    idFor.slideToggle 400, ->

      #Completed slidetoggle
      if idFor.is(":visible")
        currentButton.html "<i class=\"glyphicon glyphicon-chevron-up text-muted\"></i>"
      else
        currentButton.html "<i class=\"glyphicon glyphicon-chevron-down text-muted\"></i>"


  $("[data-toggle=\"tooltip\"]").tooltip()

  $("button.btn-primary").click (e) ->
    e.preventDefault()
    id = $(this).closest('.user-infos').attr('data-id')
    $.post("/admin/printer/accept/#{id}", -> location.reload(true))

  $("button.btn-danger").click (e) ->
    e.preventDefault()
    id = $(this).closest('.user-infos').attr('data-id')
    $.post("/admin/printer/deny/#{id}", -> location.reload(true))

