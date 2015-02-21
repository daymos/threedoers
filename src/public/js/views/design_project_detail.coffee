replaceTag = (tag) ->
  tagsToReplace[tag] or tag

safe_tags_replace = (str) ->
  str.replace /[&<>]/g, replaceTag

tagsToReplace =
  "&": "&amp;"
  "<": "&lt;"
  ">": "&gt;"

address = null
shippingRate = null
shippingMethod = null

$(document).ready ->
  ###
  # CSRF Protection
  ###
  CSRF_HEADER = "X-CSRF-Token"

  setCSRFToken = (securityToken) ->
    jQuery.ajaxPrefilter (options, _, xhr) ->
      xhr.setRequestHeader CSRF_HEADER, securityToken  unless xhr.crossDomain


  setCSRFToken $("meta[name=\"csrf-token\"]").attr("content")

  ###
  # Some controllers
  ###


#  $("#title").editable("/filemanager/project/title/#{project.id}")
#  $("#description").editable("/filemanager/project/description/#{project.id}")

  $("#comment-button").click (e) ->
    e.preventDefault()
    $.ajax
      url: "/design/project/comment/#{project.id}"
      method: "post"
      dataType: "json"
      data: {message: $("#comment-text").val()}

      success: (data) ->
        template = "<div class='media'><a href='#' class='pull-left'><img src='/#{data.photo}' alt='' class='media-object' height='78' width='78'></a>
              <div class='media-body'>
                <p>#{safe_tags_replace(data.content)}</p>
              </div>
              <div class='media-meta'>by <span class='author'>#{data.username}</span> <span class='date'>#{Date(data.createdAt)}</span></div>
            </div>"

        $("#comment-list").append($(template))
        $("#comment-text").val("")  # cleaning the textarea

      statusCode:
        400: (data) ->
          data = JSON.parse(data.responseText)
          alert(data.msg)

#  # Set fieldname
#  $.ajaxUploadSettings.name = "thumbnail"
#  $("#upload-reviewed-file").ajaxUploadPrompt
#    url: "/filemanager/upload-review/#{project.id}"
#
#    error: ->
#      alert("error uploading file")
#
#    success: (data) ->
#      if data.errors
#        for k, v of object
#          alert("#{k}: #{v}")
#      else
#        location.href = data.redirectTo
