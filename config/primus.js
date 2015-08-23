/**
 *  @copyright 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 *
 *  @fileoverview This module will only config the primus server
 *  all related with primus.
 */

import multiplex from 'primus-multiplex';
import rooms from 'primus-rooms';

import mUser from 'models/user';
import getLogger from 'utils/logger';


let logger = getLogger('Primus::Config');
let configurePrimus;

function _session (options) {
  var key = options.key || 'connect.sid'
    , store = options.store
    , primus = this;

  if (!store) {
    //
    // Throw an error when the session store is not passed.
    //
    var message = 'Session middleware configuration failed due to missing '
      + '`store` option';
    throw new Error(message, this);
  }

  //
  // The actual session middleware. This middleware is async so we need 3
  // arguments.
  //
  function session(req, res, next) {
    //
    // The session id is stored in the cookies.
    // `req.signedCookies` is assigned by the `cookie-parser` middleware.

    var sid = req.signedCookies[key];
    logger.debug(sid);
    console.log(req.signedCookies);

    //
    // Default to an empty session.
    //
    req.session = {};

    //
    // If we don't have a session id we are done.
    //
    if (!sid) {
      return next();
    }

    //
    // Pause the request before retrieving the session. This ensures that no
    // `data` event is lost while we perform our async call.
    //
    req.pause();

    //
    // Grab the session from the store.
    //
    store.get(sid, function (err, sess) {
      //
      // At this point the request stream can resume emitting `data` events.
      //
      req.resume();

      //
      // We don't want to kill the connection when we get an error from the
      // session store so we just log the error.
      //
      if (err) {
        primus.emit('log', 'error', err);
        return next();
      }

      if (sess) {
        store.createSession(req, sess);
      }

      next();
    });
  }

  return session;
}


export default configurePrimus = function (app, primus, shared) {
  primus.before('cookies', shared.cookies);
  primus.before('session', _session, {store: shared.sessionStore});
  primus.before('user', function (req, res, next) {
    mUser.User.findOne({_id: req.session.passport.user}, function (err, user) {
      if (err) {
        next(err);
      } else {
        req.user = user;
        next();
      }
    });
  });

  primus.use('multiplex', multiplex);
  primus.use('rooms', rooms);
};
