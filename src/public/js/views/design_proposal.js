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
    $('#proposalForm').validate({
      rules: {
        hours: {
          required: true,
          number: true
        },
        cost: {
          required: true,
          number: true
        }
      },
      submitHandler: function(form) {
        alert('valid form submitted');
        return false;
      }
    });
    return $("button.fire-modal-proposal").click(function(event) {
      $("form#proposalForm").attr("action", "/design/proposal/" + event.target.id);
    });
  });

}).call(this);
