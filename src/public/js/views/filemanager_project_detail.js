(function() {
  var address, replaceTag, safe_tags_replace, shippingMethod, shippingRate, tagsToReplace;

  replaceTag = function(tag) {
    return tagsToReplace[tag] || tag;
  };

  safe_tags_replace = function(str) {
    return str.replace(/[&<>]/g, replaceTag);
  };

  tagsToReplace = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;"
  };

  address = null;

  shippingRate = null;

  shippingMethod = null;

  $(document).ready(function() {
    /*
    # CSRF Protection
    */

    var CSRF_HEADER, setCSRFToken;
    CSRF_HEADER = "X-CSRF-Token";
    setCSRFToken = function(securityToken) {
      return jQuery.ajaxPrefilter(function(options, _, xhr) {
        if (!xhr.crossDomain) {
          return xhr.setRequestHeader(CSRF_HEADER, securityToken);
        }
      });
    };
    setCSRFToken($("meta[name=\"csrf-token\"]").attr("content"));
    /*
    # Some controllers
    */

    $("#title").editable("/filemanager/project/title/" + project.id);
    $("#description").editable("/filemanager/project/description/" + project.id);
    $("#comment-button").click(function(e) {
      e.preventDefault();
      return $.ajax({
        url: "/filemanager/project/comment/" + project.id,
        method: "post",
        dataType: "json",
        data: {
          message: $("#comment-text").val()
        },
        success: function(data) {
          var template;
          template = "<div class='media'><a href='#' class='pull-left'><img src='/" + data.photo + "' alt='' class='media-object' height='78' width='78'></a>              <div class='media-body'>                <p>" + (safe_tags_replace(data.content)) + "</p>              </div>              <div class='media-meta'>by <span class='author'>" + data.username + "</span> <span class='date'>" + (Date(data.createdAt)) + "</span></div>            </div>";
          $("#comment-list").append($(template));
          return $("#comment-text").val("");
        },
        statusCode: {
          400: function(data) {
            data = JSON.parse(data.responseText);
            return alert(data.msg);
          }
        }
      });
    });
    $.ajaxUploadSettings.name = "thumbnail";
    return $("#upload-reviewed-file").ajaxUploadPrompt({
      url: "/filemanager/upload-review/" + project.id,
      error: function() {
        return alert("error uploading file");
      },
      success: function(data) {
        var k, v, _results;
        if (data.errors) {
          _results = [];
          for (k in object) {
            v = object[k];
            _results.push(alert("" + k + ": " + v));
          }
          return _results;
        } else {
          return location.href = data.redirectTo;
        }
      }
    });
  });

}).call(this);
