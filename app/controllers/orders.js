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
import Decimal from 'decimal.js';

// React components
import React from 'react';
import Router from 'react-router';

import routes from 'components/routes.jsx';

import Order from 'models/order';
import Notification from 'models/notification';
import mProjects from 'models/project';
import mUsers from 'models/user';

import * as OrderUtils from 'utils/order';
import getLogger from 'utils/logger';
import mailer from 'utils/mailer';
import { orderChannel } from 'controllers/primus';
import { ORDER_STATUSES, PROJECT_MATERIALS } from 'utils/constants';
import { EURO_TAXES, PRINTING_PERCENTAGE } from 'utils/constants';
import { NOTIFICATION_TYPES } from 'utils/constants';


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
    let reactHTML = React.renderToString(<Root order={req.order.toObject()} user={req.user} />);
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


export let requestPrintOrder = function (req, res, next) {

  let error;
  let address;
  let canModify = req.order.customer &&
    req.user._id.equals(req.order.customer._id);

  canModify = canModify && req.order.status < ORDER_STATUSES.PRINT_REQUESTED[0];

  if (!canModify) {
    error = new Error();
    error.status = HTTPStatus.PRECONDITION_FAILED;
    return next(error);
  }

  for (let index = 0; index < req.user.shippingAddresses.length; index++) {
    if (req.user.shippingAddresses[index].active) {
      address = req.user.shippingAddresses[index];
      break;
    }
  }

  // If not address response with Bad Request
  if (!address) {
    error = new Error();
    error.status = HTTPStatus.PRECONDITION_FAILED;
    error.fields = {
      address: 'This field is required'
    };
    return next(error);
  }

  req.order.customerAddress = address.object_id;

  let withPrinter = req.body.printer;
  withPrinter = withPrinter && req.body.printer.match(/^[0-9a-fA-F]{24}$/);

  if (withPrinter) {
    req.order.reviewStartAt = new Date();
    req.order.status = ORDER_STATUSES.PRINT_REVIEW[0];
    req.order.printer = req.body.printer;

    mUsers.User.findOne(
      {_id: req.body.printer, printer: 'accepted'},
      {_id: 1, photo: 1, avatar: 1, username: 1, email: 1}
    ).exec(function (userFetchError, printer) {
      if (userFetchError) {
        return next(userFetchError);
      }

      req.order.save(function (updateOrderError) {
        if (updateOrderError) {
          return next(updateOrderError);
        }

        let context = {
          order: req.order,
          user: printer,
          site: nconf.get('site')
        };

        let options = {
          from: nconf.get('mailer:defaultFrom'),
          to: [printer.email],
          subject: nconf.get('emailSubjects:order:printer:review')
        };

        mailer.send(
          'mail/order/printer/review-requested.html',
          context,
          options);

        let orderResponse = req.order.toObject();
        orderResponse.printer = printer.toObject();
        return res.json(orderResponse);
      });
    });
  } else {
    req.order.placedAt = new Date();
    req.order.status = ORDER_STATUSES.PRINT_REQUESTED[0];

    mUsers.User.find({printer: 'accepted'})
    .exec(function (usersFetchError, printers) {
      if (usersFetchError) {
        return next(usersFetchError);
      }

      req.order.save(function (updateOrderError) {
        if (updateOrderError) {
          return next(updateOrderError);
        }

        let context, options;

        for (let index in printers) {
          let printer = printers[index];
          if (printer.mailNotification) {
            context = {
              order: req.order,
              user: printer,
              site: nconf.get('site')
            };

            options = {
              from: nconf.get('mailer:defaultFrom'),
              to: [printer.email],
              subject: nconf.get('emailSubjects:order:printer:requested')
            };

            mailer.send(
              'mail/order/printer/print-requested.html',
              context,
              options
            );
          }
        }

        return res.json(req.order.toObject());
      });
    });
  }
};


export let denyOrderApi = function (req, res, next) {
  let canModify = req.order.printer &&
    req.user._id.equals(req.order.printer._id);

  if (canModify && req.order.status === ORDER_STATUSES.PRINT_REVIEW[0]) {
    // clean all data set by printer

    req.order.printer = null;
    req.order.status = ORDER_STATUSES.PRINT_REQUESTED[0];
    req.order.comments = [];
    _.each(req.order.projects, function (project) {
      project.additionalProcessing = 0;
    });

    req.order.save(function (saveOrderError) {
      if (saveOrderError) {
        return next(saveOrderError);
      } else {
        let room = orderChannel.room(req.params.orderID);
        room.write({action: 'statusUpdated', order: req.order.toObject()});
        return res.sendStatus(200);
      }
    });
  } else {
    let error = new Error('Order Item can not be modified at this status');
    error.status = HTTPStatus.PRECONDITION_FAILED;
    return next(error);
  }
};


export let acceptOrderApi = function (req, res, next) {
  let canModify = req.order.printer &&
    req.user._id.equals(req.order.printer._id);

  if (canModify && req.order.status === ORDER_STATUSES.PRINT_REVIEW[0]) {

    // If printer doesn't have an address return error
    if (!(req.user.printerAddress && req.user.printerAddress.object_id)) {
      let error = new Error();
      error.status = HTTPStatus.PRECONDITION_FAILED;
      error.fields = {
        address: 'We need this value set first'
      };
      return next(error);
    }

    // If printer doesn't have a verified paypal email.
    if (!(req.user.paypal && req.user.paypal.email)) {
      let error = new Error();
      error.status = HTTPStatus.PRECONDITION_FAILED;
      error.fields = {
        paypal: 'We need this value set first'
      };
      return next(error);
    }

    let price = new Decimal(0);
    let taxes, totalPrice, printerPayment, businessPayment;

    // we need to collect all values
    _.forEach(req.order.projects, function(project) {
      price = price.plus(project.totalPrice);
      if (project.needsAdditionalProcessing) {
        price = price.plus(project.additionalProcessing);
      }
    });

    taxes = price.times(EURO_TAXES).toDecimalPlaces(2);
    totalPrice = price.minus(taxes).toDecimalPlaces(2);
    printerPayment = totalPrice.times(PRINTING_PERCENTAGE).toDecimalPlaces(2);
    businessPayment = totalPrice.minus(printerPayment).toDecimalPlaces(2);

    req.order.taxes = taxes;
    req.order.totalPrice = totalPrice;
    req.order.printerPayment = printerPayment;
    req.order.businessPayment = businessPayment;
    req.order.printerAddress = req.user.printerAddress.object_id;

    req.order.status = ORDER_STATUSES.PRINT_ACCEPTED[0];

    req.order.save(function (saveOrderError) {
      if (saveOrderError) {
        return next(saveOrderError);
      } else {
        let context = {
          order: req.order,
          user: req.order.customer,
          site: nconf.get('site')
        };

        let options = {
          from: nconf.get('mailer:defaultFrom'),
          to: [req.order.customer.email],
          subject:
            nconf.get('emailSubjects:order:customer:accepted')
        };

        mailer.send(
          'mail/order/customer/print-accepted.html',
          context,
          options);


        let room = orderChannel.room(req.params.orderID);
        room.write({action: 'statusUpdated', order: req.order.toObject()});
        OrderUtils.requestShippingRate(req.order);
        return res.sendStatus(200);
      }
    });
  } else {
    let error = new Error('Order Item can not be modified at this status');
    error.status = HTTPStatus.PRECONDITION_FAILED;
    return next(error);
  }
};


export let removeOrderApi = function (req, res, next) {
  let error;
  let canModify = req.order.customer &&
    req.user._id.equals(req.order.customer._id);

  canModify = canModify ||
    (req.session.orders &&
     req.session.orders.indexOf(req.order._id.toHexString()) !== -1);

  if (canModify && req.order.status < ORDER_STATUSES.PRINT_ACCEPTED[0]) {
    let projects = _.pluck(req.order.projects, 'project');
    projects = _.pluck(projects, '_id');

    req.order.remove(function (orderDeleteError) {
      if (orderDeleteError) {
        return next(orderDeleteError);
      }

      // if order.cusoter is empty is anonymous so we need to delete
      if (!req.order.customer) {
        mProjects.STLProject.find({
          _id: {$in: projects},
          user: {$exists: false}
        }).remove().exec();
      }

      let room = orderChannel.room(req.params.orderID);
      room.write({action: 'deleted'});

      res.status(HTTPStatus.NO_CONTENT);
      return res.send();
    });
  } else {
    error = new Error('Order can not be deleted at this status');
    error.status = HTTPStatus.PRECONDITION_FAILED;
    return next(error);
  }
};


export let deleteOrderItemAPI = function (req, res, next) {
  let error;
  let item = req.order.projects.pull(req.params.itemID);
  let canModify = req.order.customer &&
    req.user._id.equals(req.order.customer._id);

  canModify = canModify ||
    (req.session.orders &&
     req.session.orders.indexOf(req.order._id.toHexString()) !== -1);

  if (canModify && req.order.status < ORDER_STATUSES.PRINT_REQUESTED[0]) {
    if (item) {
      req.order.save(function (err, order) {
        if (err) {
          return next(err);
        } else {
          return res.end();
        }
      });
    } else {
      error = new Error('Item not found');
      error.status = HTTPStatus.NOT_FOUND;
    }
  } else {
    error = new Error('Order Item can not be modified at this status');
    error.status = HTTPStatus.PRECONDITION_FAILED;
  }

  if (error) {
    return next(error);
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

  let printerCanModify = req.order.printer &&
    req.user._id.equals(req.order.printer._id);

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
        OrderUtils.processOrderItem(item, req.params.orderID);
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
      } else {
        error = new Error(`${req.body.amount} is not a valid number.`);
        error.status = HTTPStatus.BAD_REQUEST;
      }
    }

    // handle extra work
    if (req.body.additionalProcessing !== undefined) {
      item.needsAdditionalProcessing = req.body.additionalProcessing;
      modified = true;
    }

  } else if (printerCanModify &&
             req.order.status === ORDER_STATUSES.PRINT_REVIEW[0]) {
    if (!isNaN(req.body.additionalProcessing) &&
       parseInt(req.body.additionalProcessing) > 0) {

      let room = orderChannel.room(req.params.orderID);

      Order.update({'projects._id': item._id}, {
        '$set': {
          'projects.$.additionalProcessing': req.body.additionalProcessing
        }
      }, function (err) {
        if (err) {
          room.write({status: 'error', message: err.message});
        } else {
          item.additionalProcessing = req.body.additionalProcessing;
          room.write({action: 'itemUpdated', item});
        }
      });
    } else {
      error = new Error();
      error.fields = {
        additionalProcessing: `${req.body.additionalProcessing} is not a valid number.`
      };
      error.status = HTTPStatus.BAD_REQUEST;
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


/**
 * Create new comment to order.
 */
export let createComment = function (req, res, next) {
  if (req.order.status >= ORDER_STATUSES.PRINT_REVIEW[0]) {

    if (req.body.comment) {
      let comment = {
        author: req.user.id,
        content: req.body.comment,
        createdAt: Date.now()
      };

      req.order.comments.push(comment);
      req.order.save(function (saveOrderError) {
        if (saveOrderError) {
          return next(saveOrderError);
        }

        comment = req.order.comments[req.order.comments.length - 1];
        comment.author = {
          _id: req.user.id,
          username: req.user.username,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          photo: req.user.photo,
          avatar: req.user.avatar
        };

        res.status(HTTPStatus.CREATED);
        res.json(comment);

        // Send notification, websocket
        let room = orderChannel.room(req.params.orderID);
        room.write({action: 'newComment', comment: comment});

        // Create new notification!
        let recipient;
        if (req.user._id.equals(req.order.customer._id)) {
          recipient = req.order.printer;
        } else {
          recipient = req.order.customer;
        }

        let query = {
          recipient: recipient._id,
          relatedObject: req.order._id,
          type: NOTIFICATION_TYPES.COMMENT[0],
          read: false
        };

        Notification.find(
          query,
          function (fetchNotificationError, notifications) {
            if (notifications.length === 0) {
              let notification = new Notification({
                relatedObject: req.order._id,
                read: false,
                type: NOTIFICATION_TYPES.COMMENT[0],
                deleted: false,
                recipient: recipient._id,
                creator: req.user._id
              });

              notification.save();

              let context = {
                order: req.order,
                user: recipient,
                site: nconf.get('site')
              };

              let options = {
                from: nconf.get('mailer:defaultFrom'),
                to: [recipient.email],
                subject:
                  nconf.get('emailSubjects:order:notification:newComment')
              };

              mailer.send(
                'mail/order/notification/new-comment.html',
                context,
                options);
            }
          }
        );
      });
    } else {
      let error = new Error();
      error.fields = {
        comment: 'This field is required.'
      };
      error.status = HTTPStatus.BAD_REQUEST;
      return next(error);
    }

  } else {
    let error = new Error('Order Item can not be modified at this status');
    error.status = HTTPStatus.PRECONDITION_FAILED;
    return next(error);
  }
};
