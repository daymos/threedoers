$(document).ready ->
  panels = $(".user-infos")
  panelsButton = $(".dropdown-user")
  panels.hide()

  # panelsButton.each (element) ->
  #   viewer = new JSC3D.Viewer $(this).parent().find('canvas').get(0)
  #   viewer.setParameter 'SceneUrl', "/#{$(this).attr('data-file')}"
  #   viewer.setParameter 'ModelColor', '#CAA618'
  #   viewer.setParameter 'BackgroundColor1', '#E5D7BA'
  #   viewer.setParameter 'BackgroundColor2', '#383840'
  #   viewer.setParameter 'RenderMode', 'smooth'
  #   viewer.init()
  #   viewer.update()

  #Click dropdown
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
    alert "This is a demo.\n :-)"

