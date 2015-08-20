/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 * @fileoverview This file will contains all functionality to handle primus.
 *
 * All realtime should be located here.
 */

import Order from 'models/order';

import getLogger from 'utils/logger';
import * as OrderUtils from 'utils/order';

let logger = getLogger('Primus');

export let orderChannel;

/**
 * This function will create all logic to handle order comunication.
 */
function setupOrderChannel (primus) {
  orderChannel = primus.channel('orders');

  orderChannel.on('connection', function (spark) {
    // TODO: Move to one place this
    let processCallback = function (item) {
      return function (err, data) {
        if (err) {
          spark.write({status: 'error', message: err.message});
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
              spark.write({status: 'error', message: _err.message});
            } else {
              item.volume = data.volume;
              item.weight = data.weight;
              item.density = data.density;
              item.unit = data.unit;
              item.dimension = data.dimension;
              item.surface = data.surface;
              item.totalPrice = price;
              spark.write({action: 'itemUpdated', item});
            }
          });
        }
      };
    };

    spark.on('data', function (data) {
      let action = data.action;
      let order = data.order;

      if (action === 'leave') {
        spark.leave(order, function () {
          logger.info(`Spark ${spark.id} is disconnected now`);
        });
      } else if (action === 'join') {
        OrderUtils.getRelatedOrder(spark.request, order, function (err, _order) {
          if (err) {
            spark.write({status: 'error', message: err.message});
          } else {
            spark.join(order);
            let index = 0;
            while (index < _order.projects.length){
              let item = _order.projects[index];
              if (item.volume === undefined) {
                OrderUtils.processVolumeWeight(item, processCallback(item));
              }
              index++;
            }
          }
        });
      } else {
        logger.info(`Spark ${spark.id} is connected but not acction required.`);
      }
    });
  });
}

export let setRealTime = function (primus) {
  setupOrderChannel(primus);
};

