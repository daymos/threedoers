(function() {
  var updateFrontEnd;

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

  $(document).ready(function() {
    var socket, viewer;
    socket = io.connect("/project?project=" + project);
    socket.on('error', function(data) {
      return console.log(data.msg);
    });
    socket.on('update', function(data) {
      console.log(data);
      return updateFrontEnd(data);
    });
    if (!Modernizr.canvas) {
      $("#message-canvas").removeClass('hide');
    }
    viewer = new JSC3D.Viewer($('#cv').get(0));
    viewer.setParameter('SceneUrl', "/" + filename);
    viewer.setParameter('ModelColor', '#CAA618');
    viewer.setParameter('BackgroundColor1', '#E5D7BA');
    viewer.setParameter('BackgroundColor2', '#383840');
    viewer.setParameter('RenderMode', 'smooth');
    viewer.init();
    return viewer.update();
  });

}).call(this);
