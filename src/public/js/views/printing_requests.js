(function() {
  $(document).ready(function() {
    /*
    # CSRF Protection
    */

    var CSRF_HEADER, panels, panelsButton, setCSRFToken;
    CSRF_HEADER = "X-CSRF-Token";
    setCSRFToken = function(securityToken) {
      return jQuery.ajaxPrefilter(function(options, _, xhr) {
        if (!xhr.crossDomain) {
          return xhr.setRequestHeader(CSRF_HEADER, securityToken);
        }
      });
    };
    setCSRFToken($("meta[name=\"csrf-token\"]").attr("content"));
    panels = $(".user-infos");
    panelsButton = $(".dropdown-user");
    panels.hide();
    panelsButton.click(function() {
      var currentButton, dataFor, idFor;
      dataFor = $(this).attr("data-for");
      idFor = $("." + dataFor);
      currentButton = $(this);
      return idFor.slideToggle(400, function() {
        if (idFor.is(":visible")) {
          return currentButton.html("<i class=\"glyphicon glyphicon-chevron-up text-muted\"></i>");
        } else {
          return currentButton.html("<i class=\"glyphicon glyphicon-chevron-down text-muted\"></i>");
        }
      });
    });
    $("[data-toggle=\"tooltip\"]").tooltip();
    return $("button").click(function(e) {
      e.preventDefault();
      return $.ajax({
        url: "/printing/accept/" + ($(this).closest(".user-infos").attr('data-project')),
        method: "post",
        dataType: "json",
        success: function(data) {
          alert(data.msg);
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
