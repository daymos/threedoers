import {exec} from 'child_process';

import 'datejs';
import nconf from 'nconf';
import _ from 'lodash';
import Decimal from 'decimal.js';
import HTTPStatus from 'http-status';
import shippoAPI from 'shippo';

import Order from 'models/order';
import {orderChannel} from 'controllers/primus';

import getLogger from 'utils/logger';


let logger = getLogger('Utils::Orders');
let shippo = shippoAPI(nconf.get('goshippo:secret'));


export function populateOrder (order, callback) {
  let userPopulate =
    'photo avatar username email firstName lastName emailNotification';

  order
  .populate('customer', userPopulate)
  .populate('printer', userPopulate)
  .populate('comments.author', 'photo avatar username email firstName lastName')
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
  let userPopulate =
    'photo avatar username email firstName lastName emailNotification';

  let query = Order.findOne({_id: orderID})
  .populate('customer', userPopulate)
  .populate('printer', userPopulate + ' paypal')
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

      Order.find({_id: orderID}).update({'projects._id': item._id}, {
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


// TODO: add some validation before
export function requestShippingRate (order) {
  let requestRate = function (shipping) {
    shippo.shipment.rates(shipping.object_id, 'EUR')
    .then(function (rates) {
      let selectedRate, price = 9999999999.0;
      for (let rate in rates.results) {
        rate = rates.results[rate];
        let ratePrice = parseFloat(rate.amount_local);
        if (rate.object_purpose === 'PURCHASE' &&
            rate.currency === 'EUR' && price > ratePrice && ratePrice > 0) {
          selectedRate = rate;
          price = ratePrice;
        }
      }

      if (selectedRate) {
        // Requires callback to save into mongo :S.
        order.update({'rate': selectedRate}, function () {});
        order.rate = selectedRate; // this to update frontend!

        let room = orderChannel.room(order._id.toHexString());
        // TODO: maybe use a better action???
        room.write({action: 'statusUpdated', order: order.toObject()});
        logger.info(`New rate for order: ${ order._id.toHexString() }`);
      }
    }, function(reason) {
      logger.error('Couldn\'t get rates.', JSON.stringify(reason));
    });
  };

  let requestShipment = function () {
    let submissionDate = Date.today().next().friday();
    shippo.shipment.create({
      object_purpose: 'PURCHASE',
      address_from: order.printerAddress,
      address_to: order.customerAddress,
      parcel: order.parcel.object_id,
      submission_type: 'DROPOFF',
      submission_date: submissionDate
    }).then(function (shipment) {
      order.update({shipment}, function () {});
      order.shipment = shipment; // This to update frontend!
      requestRate(order.shipment);
    }, function(reason) {
      logger.error('Couldn\'t create a shipment', JSON.stringify(reason));
    });
  };

  // If parcel was created request the shipment
  if (order.parcel && order.parcel.object_id) {
    // If submition date was not expired request new one
    let expiredShippment = order.shipment &&
      Date.parse(order.shipment.submission_date) < Date.today();

    if (order.shipment && (!order.rate || expiredShippment)) {
      requestRate(order.shipment);
    } else {
      requestShipment();
    }

  } else {
    // create parcel stargin with the smallest box
    let length = 10, width = 10, height = 10, weight = 0, unit;

    _.each(order.projects, function (project) {
      if (project.dimension.length > length) {
        length = project.dimension.length;
      }
      if (project.dimension.width > width) {
        width = project.dimension.width;
      }
      if (project.dimension.height > height) {
        height = project.dimension.height;
      }

      weight += project.weight;

      // always same unit just to avoid hard coding.
      unit = project.unit;
    });

    shippo.parcel.create({
      length,
      width,
      height,
      distance_unit: unit,
      weight: (new Decimal(weight)).toDecimalPlaces(2).toString(),
      mass_unit: 'g'
    }).then(function(parcel) {
      order.update({parcel}, function () {});
      order.parcel = parcel; // needs to request shipment
      requestShipment();
    }, function(reason) {
      logger.error('Couldn\'t create a parcel', JSON.stringify(reason));
    });
  }
}
