import {exec} from 'child_process';

import nconf from 'nconf';
import Decimal from 'decimal.js';
import HTTPStatus from 'http-status';

import Order from 'models/order';


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
  .populate('customer', 'photo avatar username email')
  .populate('printer', 'photo avatar username email')
  .populate('projects.project');

  query.exec(function(err, order) {
    if (err) { return callback(err); }

    if (order) {
      // Test if printer has rights to see
      // FIXME: req.user.printer is backward compatibility remove later!
      let isPrinter = req.user && req.user.isPrinter &&
        req.user.printer === 'accepted';

      // FIXME: Modify this when multiorder is ready
      let canSee = isPrinter && order.printer && req.user._id.equals(order.printer);
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

  let materialPrice = 0.5;
  let density = 1.01;
  let fixedCost = 10;
  let v_s = data.surface / 100 * 0.09;
  let p_vs = v_s * density * materialPrice;
  let v_i = data.volume - v_s;
  let p_vi = v_i * 0.20 * materialPrice;
  let pb = (p_vs + p_vi) * 0.9;
  let price = pb + fixedCost;
  let totalPrice = (price * amount) - (10 * (amount - 1));

  return (new Decimal(totalPrice.toFixed(4))).toDecimalPlaces(2);
}

