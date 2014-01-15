(function() {
  var colors, updateFrontEnd;

  updateFrontEnd = function(data) {
    var element, key, _results;
    _results = [];
    for (key in data) {
      element = $("#" + key);
      if (element.length === 1) {
        element.text(data[key]);
      }
      if (key === 'status') {
        if (data[key] === 'processing') {
          _results.push($('h4.media-heading').addClass('hide'));
        } else {
          _results.push($('h4.media-heading').removeClass('hide'));
        }
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  colors = {
    black: '#000000',
    white: '#FFFFFF',
    red: '#FF0000',
    green: '#00FF00',
    blue: '#0000FF',
    yellow: '#FFFF00'
  };

  $(document).ready(function() {
    var CSRF_HEADER, setCSRFToken, socket, viewer;
    CSRF_HEADER = "X-CSRF-Token";
    setCSRFToken = function(securityToken) {
      return jQuery.ajaxPrefilter(function(options, _, xhr) {
        if (!xhr.crossDomain) {
          return xhr.setRequestHeader(CSRF_HEADER, securityToken);
        }
      });
    };
    setCSRFToken($("meta[name=\"csrf-token\"]").attr("content"));
    socket = io.connect(":" + port + "/project?project=" + project.id);
    socket.on('error', function(data) {
      return console.log(data.msg);
    });
    socket.on('update', function(data) {
      return updateFrontEnd(data);
    });
    if (!Modernizr.canvas) {
      $("#message-canvas").removeClass('hide');
    }
    viewer = new JSC3D.Viewer($('#cv').get(0));
    viewer.setParameter('SceneUrl', "/" + project.filename);
    viewer.setParameter('ModelColor', "" + colors[project.color]);
    viewer.setParameter('BackgroundColor1', '#E5D7BA');
    viewer.setParameter('BackgroundColor2', '#383840');
    viewer.setParameter('RenderMode', 'smooth');
    viewer.init();
    viewer.update();
    $("#color-chooser").val("" + project.color).change(function() {
      $.post("/project/color/" + project.id, {
        value: $(this).val()
      });
      viewer.setParameter('ModelColor', "" + colors[project.color]);
      return viewer.update(false);
    });
    $("#density-chooser").val("" + project.density).change(function() {
      return $.post("/project/density/" + project.id, {
        value: $(this).val()
      });
    });
    return $("#title").editable({
      type: 'text',
      pk: "" + project.id,
      url: '/project/title'
    });
  });

}).call(this);
