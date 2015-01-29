(function() {
  $(document).ready(function() {
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
      idFor = $(dataFor);
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
    $("button.btn-primary").click(function(e) {
      var id;
      e.preventDefault();
      id = $(this).closest('.user-infos').attr('data-id');
      return $.post("/admin/printer/accept/" + id, function() {
        return location.reload(true);
      });
    });
    return $("button.btn-danger").click(function(e) {
      var id;
      e.preventDefault();
      id = $(this).closest('.user-infos').attr('data-id');
      return $.post("/admin/printer/deny/" + id, function() {
        return location.reload(true);
      });
    });
  });

}).call(this);
