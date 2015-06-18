(function() {
  var address, colors, replaceTag, safe_tags_replace, shippingMethod, shippingRate, tagsToReplace, updateFrontEnd;

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
          $('.object-volume-unit').addClass('hide');
          $('.object-volume').text('processing');
        } else {
          $('.object-volume-unit').removeClass('hide');
          $('#order-button').prop('disabled', false);
        }
      }
      if (key === 'order') {
        $('#order-placed-order').text(" " + data[key].price + "  ");
      }
      if (key === 'status_image') {
        _results.push($('#status-image').attr("src", "/img/icons_" + data[key] + "_second.png"));
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

  address = null;

  shippingRate = null;

  shippingMethod = null;

  $(document).ready(function() {
    /*
    # CSRF Protection
    */

    var CSRF_HEADER, e, prettyDate, prettyHour, setCSRFToken, socket_project, updatePayDiv, viewer;
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

    try {
      socket_project = io.connect(":" + port + "/project", {
        query: 'project=' + project.id
      });
    } catch (_error) {
      e = _error;
      console.log({
        query: {
          project: window.location.pathname.split('/').pop()
        }
      });
      socket_project = io.connect(":" + port + "/project", {
        query: 'project=' + window.location.pathname.split('/').pop()
      });
    }
    socket_project.on('error', function(data) {
      return console.log(data.msg);
    });
    socket_project.on('update', function(data) {
      socket_project.emit('order-price', {
        ammount: $("#ammount").val()
      });
      return updateFrontEnd(data);
    });
    socket_project.on('update-price-order', function(data) {
      return $('#order-price').text(data.price);
    });
    if (!Modernizr.canvas) {
      $("#message-canvas").removeClass('hide');
    }
    /*
    # JSC3D.Viewer
    */

    if ($('#cv').get(0)) {
      viewer = new JSC3D.Viewer($('#cv').get(0));
      viewer.setParameter('SceneUrl', "/" + project.filename);
      viewer.setParameter('ModelColor', "" + colors[project.color]);
      viewer.setParameter('BackgroundColor1', '#E5D7BA');
      viewer.setParameter('BackgroundColor2', '#383840');
      viewer.setParameter('RenderMode', 'smooth');
      viewer.setParameter('Definition', 'high');
      viewer.setParameter('MipMapping', 'on');
      viewer.setParameter('CreaseAngle', '30');
      viewer.onloadingcomplete = function() {
        if (!project.hasImage) {
          return setTimeout(function() {
            return $.post("/project/" + project.id + "/image/", {
              image: $("#cv")[0].toDataURL()
            });
          }, 15000);
        }
      };
      viewer.init();
      viewer.update();
    }
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
    $("#material-chooser").val("" + project.material);
    $("#material-chooser").val("" + project.material).change(function() {
      return $.post("/project/material/" + project.id, {
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
        return socket_project.emit('order-price', {
          ammount: $("#ammount").val()
        });
      } else {
        return event.preventDefault();
      }
    });
    prettyDate = function(dateString) {
      var d, date, h, m, mm, monthNames, y;
      date = new Date(dateString);
      d = date.getDate();
      monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      m = monthNames[date.getMonth()];
      y = date.getFullYear();
      h = date.getHours();
      mm = date.getMinutes();
      return d + '/' + m + '/' + y;
    };
    prettyHour = function(dateString) {
      var d, date, h, m, mm, monthNames, y;
      date = new Date(dateString);
      d = date.getDate();
      monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      m = monthNames[date.getMonth()];
      y = date.getFullYear();
      h = date.getHours();
      mm = date.getMinutes();
      return h + ':' + mm;
    };
    $("#comment-button").click(function(e) {
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
          template = "<div class='mine-chat media'>          <div class='media-body text-right'>            <div class='message'>" + (safe_tags_replace(data.content)) + "</div>            <p class='meta'> By<strong> you</strong> at<strong> " + (prettyDate(data.createdAt)) + "</strong> at<strong> " + (prettyHour(data.createdAt)) + " pm</strong></p>          </div>          <div class='media-right'><a href='#'><img src='/" + data.photo + "' style='width:50px; height:50px' class='media-object'></a></div>        </div>";
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
    updatePayDiv = function() {
      if (address) {
        return $.ajax({
          url: "/validate-address-and-rate/" + project.id,
          data: address,
          dataType: 'json',
          success: function(data) {
            var error;
            if (data.errors) {
              for (error in data.errors) {
                alert("" + data.errors[error].param + ": " + data.errors[error].msg);
              }
            }
            if (data.message) {
              alert(data.message);
            }
            if (data.ok) {
              address = data.address;
              shippingRate = parseFloat(data.charge);
              $('#address-selection').hide();
              $('#pay-values').show();
              $('#pay-product-price').html("" + project.orderPrice);
              $('#pay-shipping-price').html("" + shippingRate);
              return $('#pay-total-price').html("" + ((project.orderPrice + shippingRate).toFixed(2)));
            } else {
              return alert("Something was wrong please try again.");
            }
          },
          error: function() {
            return alert("Something was wrong please try again.");
          }
        });
      } else {
        return alert("Please select and address or add new one.");
      }
    };
    $('a.select-saved-address').click(function(event) {
      event.preventDefault();
      address = {
        id: $(this).attr('data-id')
      };
      return updatePayDiv();
    });
    $('button#validate-address').click(function(event) {
      var a;
      event.preventDefault();
      address = {};
      a = $(this).closest('form').serializeArray();
      $.each(a, function() {
        if (address[this.name]) {
          if (!address[this.name].push) {
            address[this.name] = [address[this.name]];
          }
          address[this.name].push(this.value || "");
        } else {
          address[this.name] = this.value || "";
        }
      });
      return updatePayDiv();
    });
    $('#payment-form').submit(function(event) {
      var $form;
      event.preventDefault();
      $form = $('#payment-form');
      shippingMethod = 'shipping';
      if (shippingMethod === 'shipping') {
        return $('#payment-modal').modal('show');
      } else {
        $("#hidden-pay-form #shippingMethod").val(shippingMethod);
        return $("#hidden-pay-form").submit();
      }
    });
    $('.close-payment-modal').click(function(event) {
      return $('#payment-modal').modal('hide');
    });
    $('#payment-modal').on('hidden.bs.modal', function(event) {
      $('#address-selection').show();
      $('#pay-values').hide();
      address = null;
      shippingMethod = null;
      return shippingRate = null;
    });
    $('#pay-payment-modal').click(function(event) {
      $("#hidden-pay-form #shippingRate").val(shippingRate);
      $("#hidden-pay-form #shippingMethod").val(shippingMethod);
      $("#hidden-pay-form #shippingAddress").val(JSON.stringify(address));
      return $("#hidden-pay-form").submit();
    });
    $('#printer-input').val('').blur(function() {
      var active;
      active = $("#printer-input").typeahead("getActive");
      if (active) {
        $('#printer-input').val("" + active.username);
        return $('#printer-input').closest('div').append("<span class='glyphicon glyphicon-ok form-control-feedback' aria-hidden='true'></span>");
      }
    });
    return $('#printer-input').typeahead({
      delay: 300,
      source: function(query, process) {
        var active;
        active = $("#printer-input").typeahead("getActive");
        if (!(active && ("" + active.username) === query)) {
          return $.get("/api/printers?q=" + query).done(function(data, status, xhr) {
            process(data);
            return $('#printer-input').closest('div').find('.glyphicon').remove();
          });
        }
      },
      matcher: function(item) {
        return ~(item.username.toLowerCase().indexOf(this.query.toLowerCase()) && item.email.toLowerCase().indexOf(this.query.toLowerCase()));
      },
      afterSelect: function() {
        var active;
        $('#printer-input').closest('div').append("<span class='glyphicon glyphicon-ok form-control-feedback' aria-hidden='true'></span>");
        active = $("#printer-input").typeahead("getActive");
        return $('#printer-hidden').val(active._id);
      },
      displayText: function(item) {
        return "" + item.username;
      }
    });
  });

}).call(this);
