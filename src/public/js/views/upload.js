(function() {
  $(document).ready(function() {
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
    $.ajaxUploadSettings.name = "thumbnail";
    return $("#clickable").ajaxUploadPrompt({
      url: "./upload",
      beforeSend: function() {
        $("#promptzone").hide();
        return $(".progress-bar").parent().removeClass('hide');
      },
      onprogress: function(e) {
        var percentComplete;
        if (e.lengthComputable) {
          percentComplete = ((e.loaded / e.total) * 100).toFixed(2);
          return $(".progress-bar").css('width', "" + percentComplete + "%").attr('aria-valuenow', "" + percentComplete).html("" + percentComplete + "% Complete");
        }
      },
      error: function() {
        var html;
        html = '<br><div class="alert alert-danger"><strong>Error</strong> uploading your file, please try again.</div>';
        return $("#result").html(html);
      },
      success: function(data) {
        if (data.errors) {
          alert("Thumbnail: " + data.errors.thumbnail.msg);
          $("#promptzone").show();
          return $(".progress-bar").parent().addClass('hide');
        } else {
          return location.href = data.redirectTo;
        }
      }
    });
  });

}).call(this);
