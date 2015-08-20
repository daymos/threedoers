/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

// Third party modules
import nconf from 'nconf';
import HTTPStatus from 'http-status';

// React components
import React from 'react';
import Router from 'react-router';

import routes from 'components/routes.jsx';
import Order from 'models/order';
import * as OrderUtils from 'utils/order';
import getLogger from 'utils/logger';
import {orderChannel} from 'controllers/primus';
import {ORDER_STATUSES, PROJECT_MATERIALS} from 'utils/constants';

let logger = getLogger('Controller::Orders');


export let paramOrder = function paramProject (req, res, next, orderID) {
  OrderUtils.getRelatedOrder(req, orderID, function (err, order) {
    if (err) {
      next(err);
    } else {
      req.order = order;
      next();
    }
  });
};


export let createOrder = function (req, res, next) {
  Router.run(routes, req.originalUrl, function (Root, state) {
    let user = req.user ? req.user.getVisibleFields() : undefined;
    let reactHTML = React.renderToString(<Root user={user} />);
    let reactState = {user};
    reactState = JSON.stringify(reactState);
    return res.render('layout.html', {reactHTML, reactState});
  });
};

export let orderDetail = function (req, res, next) {
  Router.run(routes, req.originalUrl, function (Root, state) {
    let reactHTML = React.renderToString(<Root order={req.order.toObject()} />);
    let user = req.user ? req.user.getVisibleFields() : undefined;
    let reactState = {user, order: req.order.toObject()};
    reactState = JSON.stringify(reactState);
    return res.render('layout.html', {reactHTML, reactState});
  });
};

/**
 * API routes
 */

export let orderCreateApi = function (req, res, next) {

};


export let orderDetailApi = function (req, res, next) {
  res.json(req.order.toObject());
};


export let deleteOrderItemAPI = function (req, res, next) {
  if (req.order.projects.pull(req.params.itemID)) {
    req.order.save(function (err, order) {
      if (err) {
        return next(err);
      } else {
        return res.end();
      }
    });
  } else {
    let error = new Error('Item not found');
    error.status = HTTPStatus.NOT_FOUND;
    next(error);
  }
};


/**
 * This allow patch an order item but only if order status
 * is less than print request.
 */
export let patchOrderItemApi = function (req, res, next) {
  let item = req.order.projects.id(req.params.itemID);
  let modified = false;
  let error;

  if (!item) {
    error = new Error('Item not found');
    error.status = HTTPStatus.NOT_FOUND;
  }

  let canModify = req.order.customer &&
    req.user._id.equals(req.order.customer._id);

  canModify = canModify ||
    (req.session.orders &&
     req.session.orders.indexOf(req.order._id.toHexString()) !== -1);

  if (canModify && req.order.status < ORDER_STATUSES.PRINT_REQUESTED[0]) {
    // Handle color update
    if (req.body.color) {
      if (req.body.color.match(/red|green|blue|black|white|yellow/)) {
        item.color = req.body.color;
        modified = true;
      } else {
        error = new Error(`${req.body.color} is not a valid value.`);
        error.status = HTTPStatus.BAD_REQUEST;
      }
    }

    // handle material
    if (req.body.material) {
      if (req.body.material in PROJECT_MATERIALS) {
        item.density = PROJECT_MATERIALS[req.body.material][0];
        item.material = req.body.material;

        OrderUtils.processVolumeWeight(item, function (err, data) {
          let room = orderChannel.room(req.params.orderID);

          if (err) {
            room.write({status: 'error', message: err.message});
          } else {
            let price = OrderUtils.calculatePrice(data, item.amount);

            Order.update({'projects._id': item._id}, {
              '$set': {
                'projects.$.volume': data.volume,
                'projects.$.weight': data.weight,
                'projects.$.density': data.density,
                'projects.$.unit': data.unit,
                'projects.$.dimension': data.dimension,
                'projects.$.surface': data.surface,
                'projects.$.totalPrice': price
              }
            }, function (_err) {
              if (_err) {
                room.write({status: 'error', message: _err.message});
              } else {
                item.volume = data.volume;
                item.weight = data.weight;
                item.density = data.density;
                item.unit = data.unit;
                item.dimension = data.dimension;
                item.surface = data.surface;
                item.totalPrice = price;
                room.write({action: 'itemUpdated', item});
              }
            });
          }
        });
        modified = true;
      } else {
        error = new Error(`${req.body.material} is not a valid value.`);
        error.status = HTTPStatus.BAD_REQUEST;
      }
    }

    // handle amount
    if (req.body.amount) {
      if (!isNaN(req.body.amount)) {
        item.amount = req.body.amount;
        let data = {
          volume: item.volume,
          weight: item.weight,
          density: item.density,
          unit: item.unit,
          dimension: item.dimension,
          surface: item.surface
        };

        let room = orderChannel.room(req.params.orderID);
        let price = OrderUtils.calculatePrice(data, item.amount);
        Order.update({'projects._id': item._id}, {
          '$set': {
            'projects.$.totalPrice': price
          }
        }, function (err) {
          if (err) {
            room.write({status: 'error', message: err.message});
          } else {
            item.totalPrice = price;
            room.write({action: 'itemUpdated', item});
          }
        });
        modified = true;
      } else {
        error = new Error(`${req.body.amount} is not a valid number.`);
        error.status = HTTPStatus.BAD_REQUEST;
      }
    }

    // handle extra work
    if (req.body.additionalProcesssing !== undefined) {
      item.needsAdditionalProcessing = req.body.additionalProcesssing;
      modified = true;
    }

  } else {
    error = new Error('Order Item can not be modified at this status');
    error.status = HTTPStatus.PRECONDITION_FAILED;
  }

  if (error) {
    next(error);
  } else if (modified) {
    // save object
    req.order.save(function (err, _order) {
      if (err) {
        return next(err);
      } else {
        return res.json(_order.toObject());
      }
    });
  } else {
    res.send();
  }
};
