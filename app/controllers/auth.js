/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */
import HTTPStatus from 'http-status';


/**
 * @description Middleware used to redirect to login page is normal request.
 *
 * If ajax request shoul return forbidden.
 */
export function loginRequired (req, res, next) {
    if (req.user) {
      return next();
    } else {
      if (req.xhr) {
        let error = new Error();
        error.status = HTTPStatus.FORBIDDEN;
        return next(error);
      } else {
        return res.redirect('/accounts/login');
      }
    }
}
