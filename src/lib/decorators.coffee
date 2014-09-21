
module.exports.loginRequired = (req, res, next) ->
  # Only test it user is required if not redirect to login
  if req.user
    next()
  else
    res.redirect '/accounts/login'


module.exports.adminRequired = (req, res, next) ->
  # Only test it user is required if not redirect to login
  if req.user and req.user.admin
    next()
  else
    res.redirect '/accounts/login'


module.exports.printerRequired = (req, res, next) ->
  # Only test it user is required if not redirect to login
  if req.user and req.user.printer == "accepted"
    next()
  else
    res.redirect '/accounts/login'


module.exports.filemanagerRequired = (req, res, next) ->
  # Only test it user is required if not redirect to login
  if req.user and req.user.filemanager == "accepted"
    next()
  else
    res.redirect '/accounts/login'