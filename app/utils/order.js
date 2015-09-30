import {exec} from 'child_process';

import nconf from 'nconf';
import Decimal from 'decimal.js';
import HTTPStatus from 'http-status';

import Order from 'models/order';
import {orderChannel} from 'controllers/primus';


export function populateOrder (order, callback) {
  order
  .populate('customer', 'photo avatar username email')
  .populate('printer', 'photo avatar username email')
  .populate('projects.project')
  .exec(callback);
}


export function getRelatedOrder (req, orderID, callback) {
  /**
   * This method should be used in express app as param that will be used in
   * all views that needs an order inside.
   *
   *  1 Will display the order if anonymous and session has the rights to
   *    see it.
   *  2 Will display the order if user is printer and order has the status
   *    to se visible for printer.
   *  3 Will display the order for owner or admin.
   */

  // FIXME: Now primus has a bug and this will patch for some time
  let session = req.wsSession || req.session;
  let query = Order.findOne({_id: orderID})
  .populate('customer', 'photo avatar username email firstName lastName')
  .populate('printer', 'photo avatar username email firstName lastName')
  .populate('comments.author', 'photo avatar username email firstName lastName')
  .populate('projects.project');

  query.exec(function(err, order) {
    if (err) { return callback(err); }

    if (order) {
      // Test if printer has rights to see
      // FIXME: req.user.printer is backward compatibility remove later!
      let isPrinter = req.user && (req.user.isPrinter ||
        req.user.printer === 'accepted');

      let canSee = isPrinter && order.printer &&
        req.user._id.equals(order.printer._id);
      canSee = canSee ||
        (req.user &&
         order.customer && req.user._id.equals(order.customer._id));
      canSee = canSee ||
        (session.orders &&
         session.orders.indexOf(order._id.toHexString()) !== -1);

      if (!canSee) {
        let error = new Error('You don\'t have permission to see this order.');
        error.status = HTTPStatus.FORBIDDEN;
        return callback(error);
      }

      callback(null, order);
    } else {
      let error = new Error("Project not found.");
      error.status = HTTPStatus.NOT_FOUND;
      return callback(error);
    }
  });
}

export function processVolumeWeight (item, callback) {
  let cmd = `${nconf.get('python:bin')} ${nconf.get('python:path')}`;
  cmd = `${cmd} ${item.project.design.path} -d ${item.density}`;

  exec(cmd, function (err, stdout, stderr) {
    if (err) {
      callback(err, stderr);
    } else {
      let result = JSON.parse(stdout);
      callback(null, result);
    }
  });
}


export function calculatePrice (data, amount) {
  amount = parseInt(amount);
  let totalPrice = 0;

  if (amount > 0) {
    let materialPrice = 0.5;
    let density = 1.01;
    let fixedCost = 10;
    let v_s = data.surface / 100 * 0.09;
    let p_vs = v_s * density * materialPrice;
    let v_i = data.volume - v_s;
    let p_vi = v_i * 0.20 * materialPrice;
    let pb = (p_vs + p_vi) * 0.9;
    let price = pb + fixedCost;
    totalPrice = (price * amount) - (10 * (amount - 1));
  }

  return (new Decimal(totalPrice.toFixed(4))).toDecimalPlaces(2);
}

/**
 * @description This function is to help process an order item and
 * publish this through web sockets.
 *
 */
export function processOrderItem (item, orderID) {
  processVolumeWeight(item, function (pythonProcessError, data) {
    let room = orderChannel.room(orderID);

    if (pythonProcessError) {
      room.write({status: 'error', message: pythonProcessError.message});
    } else {
      let price = calculatePrice(data, item.amount);

      Order.update({'projects._id': item._id}, {
        '$set': {
          'projects.$.volume': data.volume,
          'projects.$.weight': data.weight,
          'projects.$.density': data.density,
          'projects.$.unit': data.unit,
          'projects.$.dimension.width': data.dimension.width,
          'projects.$.dimension.height': data.dimension.height,
          'projects.$.dimension.length': data.dimension.length,
          'projects.$.surface': data.surface,
          'projects.$.totalPrice': price
        }
      }, function (updateOrderError) {
        if (updateOrderError) {
          room.write({status: 'error', message: updateOrderError.message});
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
}
