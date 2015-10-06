/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

// Third party modules
import nconf from 'nconf';
import HTTPStatus from 'http-status';
import _ from 'lodash';
import goShippo from 'shippo';
import Paypal from 'paypal-adaptive';

import mUsers from 'models/user';

import getLogger from 'utils/logger';


let logger = getLogger('Controller::Users');
let shippo = goShippo(nconf.get('goshippo:secret'));

let env = process.env.node_env || 'development';
let isDevelopment = env === 'development';

/**
 * API routes
 */

export function createAddress (req, res, next) {

  req.assert('name', {len: 'This field is required.'}).len(2);
  req.assert('street1', {len: 'This field is required.'}).len(2);
  req.assert('city', {len: 'This field is required.'}).len(2);
  req.assert('zip_code', {len: 'This field is required.'}).len(2);
  req.assert('phone_no', {len: 'This field is required.'}).len(2);
  req.assert('country', {len: 'This field is required.'}).len(2);

  let errors = req.validationErrors(true);

  if (errors) {
    let error = new Error();
    error.status = HTTPStatus.BAD_REQUEST;
    error.fields = errors;
    return next(error);
  }

  let _address = {
    object_purpose: "PURCHASE",
    name: req.body.name,
    company: req.body.company,
    street1: req.body.street1,
    street_no: req.body.street_no,
    street2: req.body.street2,
    city: req.body.city,
    state: req.body.state,
    zip: req.body.zip_code,
    phone: req.body.phone_no,
    country: req.body.country,
    email: req.user.email
  };

  shippo.address.create(_address).then(function(address) {
    if (req.user.isPrinter || req.user.printer === 'accepted') {
      // handle address for printers
      req.user.update({printerAddress: address}, function(error) {
        if (error) {
          return next(error);
        }
        res.status = HTTPStatus.CREATED;
        return res.end();
      });
      res.status = HTTPStatus.CREATED;
      return res.end();
    } else {
      if (req.user.shippingAddresses.length === 0) {
        address.active = true;
      }

      req.user.shippingAddresses.push(address);
      req.user.save(function(error, doc) {
        if (error) {
          return next(error);
        }
        res.status = HTTPStatus.CREATED;
        return res.end();
      });
    }
  }, function(error) {
    error.status = HTTPStatus.BAD_REQUEST;
    return next(error);
  });

}


export function validatePaypalEmailAddress (req, res, next) {
  req.assert('email', 'valid email required').isEmail();
  req.assert('firstName', 'First name is required').notEmpty();
  req.assert('lastName', 'Last name is required').notEmpty();

  let errors = req.validationErrors(true);

  if (errors) {
    let error = new Error();
    error.status = HTTPStatus.BAD_REQUEST;
    error.fields = errors;
    return next(error);
  }

  let paypalSdk = new Paypal({
    userId: nconf.get('paypal:adaptive:user'),
    password: nconf.get('paypal:adaptive:password'),
    signature: nconf.get('paypal:adaptive:signature'),
    appId: nconf.get('paypal:adaptive:appID'),
    sandbox: isDevelopment
  });

  let payload = {
    emailAddress: req.body.email,
    matchCriteria: 'NAME',
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    requestEnvelope: {
      errorLanguage: 'en_US'
    }
  };

  paypalSdk.getVerifiedStatus(payload, function(message, response) {
    if (response.error) {
      let error = new Error();
      error.status = HTTPStatus.BAD_REQUEST;
      error.fields = {
        error: response.error[0].message
      };
      return next(error);
    } else {
      if (response.accountStatus != null) {
        let paypal = {
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName
        };

        req.user.update({paypal}, function(error) {
          if (error) {
            return next(error);
          }
          res.status = HTTPStatus.OK;
          return res.end();
        });
      } else {
        let error = new Error();
        error.status = HTTPStatus.BAD_REQUEST;
        error.fields = {
          error: 'Your account is not verified'
        };
        return next(error);
      }
    }
  });

}
