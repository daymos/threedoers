(function() {
  $(document).ready(function() {
    /*
    # Socket IO
    */

    var e, socket;
    try {
      if (user.id) {
        socket = io.connect(":" + port + "/notification", {
          query: "user=" + user.id + ((typeof project !== "undefined" && project !== null) ? '&project=' + project.id : '')
        });
        return socket.on('new', function(data) {
          return $.growl({
            title: "" + (data.title || '') + "<br>",
            message: data.message
          }, {
            type: data.type
          });
        });
      }
    } catch (_error) {
      e = _error;
      return console.log(e);
    }
  });

}).call(this);
;(function() {
  var Validator;

  Validator = (function() {
    function Validator(form, validations) {
      var _this = this;
      this.form = form;
      this.validations = validations;
      this.form = $(this.form);
      this.form.submit(function(event) {
        return _this.validate();
      });
    }

    Validator.prototype._required = function($element, options) {
      var label, val;
      val = $element.val();
      label = $element.siblings('label').text();
      this.message = options.message || "This field is required.";
      if (val) {
        return true;
      } else {
        return false;
      }
    };

    Validator.prototype._regexp = function($element, options) {
      var label, val;
      val = $element.val();
      label = $element.siblings('label').text();
      this.message = options.message || "This field is not valid.";
      if (val.match(options.test)) {
        return true;
      } else {
        return false;
      }
    };

    Validator.prototype._match = function($element, options) {
      var label, val1, val2;
      val1 = $element.val();
      val2 = $(options.test).val();
      label = $element.siblings('label').text();
      this.message = options.message || "Value didn't match";
      if (val1 === val2) {
        return true;
      } else {
        return false;
      }
    };

    Validator.prototype.formatOptions = function(options) {
      if (!options.test) {
        options = {
          tests: options
        };
      }
      return options;
    };

    Validator.prototype.validate = function() {
      var $element, method, result, selector;
      result = true;
      for (selector in this.validations) {
        $element = this.form.find(selector);
        for (method in this.validations[selector]) {
          if (this["_" + method]) {
            if (!this["_" + method]($element, this.formatOptions(this.validations[selector][method]))) {
              this.form.trigger('error', [$element, this.message]);
              result = false;
              break;
            } else {
              this.form.trigger('valid', [$element]);
            }
          } else {
            this.form.trigger('error', [$element, "Validator '" + method + "' is not implemented"]);
            result = false;
          }
        }
      }
      return result;
    };

    return Validator;

  })();

  this.Validator = Validator;

}).call(this);
