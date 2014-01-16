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

}).call(this);
