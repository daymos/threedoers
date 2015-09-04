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

import mUsers from 'models/user';

import getLogger from 'utils/logger';


let logger = getLogger('Controller::Users');
let shippo = goShippo(nconf.get('goshippo:secret'));

/**
 * API routes
 */

export let createAddress = function (req, res, next) {

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
      return;
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

};

