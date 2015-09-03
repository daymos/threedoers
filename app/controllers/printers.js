/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import mUsers from 'models/user';

/**
 * Returns the printers that are available to handle an order.
 *
 */
export function getPrinters (req, res, next) {
  // FIXME: move printer accepted to isPrinter field
  let q = req.query.q.split(' ')[0];
  let query = {
    printer: 'accepted',
    $or: [
      {username: {$regex: q, $options: 'si'}},
      {email: {$regex: q, $options: 'si'}}
    ]
  }

  mUsers.User.find(
    query,
    {id: true, email: true, username: true},
    function (userFetchError, users) {
      if (userFetchError) {
        return next(userFetchError);
      }

      res.json(users);
    });
}

