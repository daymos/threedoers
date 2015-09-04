
/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import HTTPStatus from 'http-status';


export function loginAPIRequired (req, res, next) {
  if (req.user) {
    next();
  } else {
    let error = new Error();
    error.status = HTTPStatus.FORBIDDEN;
    next(error);
  }
}
