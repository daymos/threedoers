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
    return $("#manager-clickable").ajaxUploadPrompt({
      url: "/filemanager/upload",
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
