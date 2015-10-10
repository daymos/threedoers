/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

// Third party modules
import HTTPStatus from 'http-status';

import { ORDER_STATUSES } from 'utils/constants';
import Order from 'models/order';
import getLogger from 'utils/logger';
import * as OrderUtils from 'utils/order';

let logger = getLogger('cron::update-rates');


export function updateRates (req, res, next) {
  var query = {
    $or: [{
      status: ORDER_STATUSES.PRINT_ACCEPTED[0],
      'order.rate': { "$exists": false }
    }, {
      status: ORDER_STATUSES.PRINTING[0],
      // submition date should be less than today
      'order.shipment.submission_date': {
        $lt: Date.today()
      }
    }]
  };

  let userPopulate =
    'photo avatar username email firstName lastName emailNotification';

  Order
  .find(query)
  .populate('customer', userPopulate)
  .populate('printer', userPopulate)
  .populate('comments.author', 'photo avatar username email firstname lastname')
  .populate('projects.project')
  .exec(function (orderFetchError, orders) {
    if (orderFetchError) {
      return next(orderFetchError);
    } else {
      logger.info('Start processing ' + orders.length + ' orders.');

      for (var order in orders) {
        order = orders[order];
        OrderUtils.requestShippingRate(order);
      }

      res.end();
    }
  });
}
