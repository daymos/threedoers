(function() {
  module.exports.loginRequired = function(req, res, next) {
    if (req.user) {
      return next();
    } else {
      return res.redirect('/accounts/login');
    }
  };

}).call(this);
