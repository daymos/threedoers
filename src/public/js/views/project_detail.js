(function() {
  var colors, replaceTag, safe_tags_replace, tagsToReplace, updateFrontEnd;

  updateFrontEnd = function(data) {
    var element, key, _results;
    _results = [];
    for (key in data) {
      element = $("#" + key);
      if (element.length === 1) {
        element.text(" " + data[key]);
      }
      if (key === 'status') {
        if (data[key] === 'processing') {
          $('.object-volume').addClass('hide');
          $('.processing-volume').removeClass('hide');
        } else {
          $('.object-volume').removeClass('hide');
          $('.processing-volume').addClass('hide');
        }
      }
      if (key === 'order') {
        _results.push($('#order-placed-order').text(" " + data[key].price));
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

  $(document).ready(function() {
    /*
    # CSRF Protection
    */

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
    /*
    # Socket IO
    */

    socket = io.connect(":" + port + "/project?project=" + project.id);
    socket.on('error', function(data) {
      return console.log(data.msg);
    });
    socket.on('update', function(data) {
      socket.emit('order-price', {
        ammount: $("#ammount").val()
      });
      return updateFrontEnd(data);
    });
    socket.on('update-price-order', function(data) {
      return $('#order-price').text(data.price);
    });
    if (!Modernizr.canvas) {
      $("#message-canvas").removeClass('hide');
    }
    /*
    # JSC3D.Viewer
    */

    viewer = new JSC3D.Viewer($('#cv').get(0));
    viewer.setParameter('SceneUrl', "/" + project.filename);
    viewer.setParameter('ModelColor', "" + colors[project.color]);
    viewer.setParameter('BackgroundColor1', '#E5D7BA');
    viewer.setParameter('InitRotationX', '25');
    viewer.setParameter('InitRotationY', '25');
    viewer.setParameter('InitRotationZ', '25');
    viewer.setParameter('BackgroundColor2', '#383840');
    viewer.setParameter('RenderMode', 'smooth');
    viewer.setParameter('Definition', 'high');
    viewer.setParameter('MipMapping', 'on');
    viewer.setParameter('CreaseAngle', '30');
    viewer.init();
    viewer.update();
    /*
    # Some controllers
    */

    $("#color-chooser").val("" + project.color);
    $("#color-chooser").val("" + project.color).change(function() {
      return $.post("/project/color/" + project.id, {
        value: $(this).val()
      }, function() {
        return location.reload();
      });
    });
    $("#density-chooser").val("" + project.density);
    $("#density-chooser").val("" + project.density).change(function() {
      return $.post("/project/density/" + project.id, {
        value: $(this).val()
      });
    });
    $("#title").editable("/project/title/" + project.id);
    $("#ammount").keyup(function(event) {
      if (/\D/g.test(this.value) || /^0$/.test(this.value)) {
        this.value = this.value.replace(/\D/g, '');
        this.value = this.value.replace(/^0$/, '');
      }
      if (/^[1-9][0-9]*$/.test(this.value) || /^\s*$/.test(this.value)) {
        $("#order-price").text("Processing");
        return socket.emit('order-price', {
          ammount: $("#ammount").val()
        });
      } else {
        return event.preventDefault();
      }
    });
    return $("#comment-button").click(function(e) {
      e.preventDefault();
      return $.ajax({
        url: "/project/comment/" + project.id,
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
  });

}).call(this);
