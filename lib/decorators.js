(function() {
  module.exports.loginRequired = function(req, res, next) {
    if (req.user) {
      return next();
    } else {
      return res.redirect('/accounts/login');
    }
  };

  module.exports.adminRequired = function(req, res, next) {
    if (req.user && req.user.admin) {
      return next();
    } else {
      return res.redirect('/accounts/login');
    }
  };

  module.exports.printerRequired = function(req, res, next) {
    if (req.user && req.user.printer === "accepted") {
      return next();
    } else {
      return res.redirect('/accounts/login');
    }
  };

  module.exports.filemanagerRequired = function(req, res, next) {
    if (req.user && req.user.filemanager === "accepted") {
      return next();
    } else {
      return res.redirect('/accounts/login');
    }
  };

}).call(this);
