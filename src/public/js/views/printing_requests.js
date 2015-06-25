(function() {
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
    $(".info_jobs_available").last().find(".separator").css("display", "none");
    $(".info > div").css("display", "block");
    return $("a.review").click(function(e) {
      e.preventDefault();
      return $.ajax({
        url: $(this).attr("href"),
        method: "post",
        dataType: "json",
        success: function(data) {
          return window.location.href = "/printing/jobs";
        },
        statusCode: {
          400: function(data) {
            alert(data.msg);
            return location.reload(true);
          }
        }
      });
    });
  });

}).call(this);
