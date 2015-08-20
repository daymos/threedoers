'use strict';

require('babel/register');
var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var nconf = require('nconf');
var getLogger = require('utils/logger');
var logger = getLogger('Migration::Project');

var config = require('../config/config');
var Project = require('models/project').STLProject;
var Order = require('models/order');

logger.info('Running migration to new schema.');

mongoose.connect(nconf.get('mongo:url'), nconf.get('mongo:options'), function(err) {
  if (err) {
    throw err;
  }
});

function orderCallback (project, next) {
  return function (err, newOrder) {
    if (err) {
      return next(err);
    }

    logger.info("Order created: ", newOrder._id.toString());
    project.order_id = newOrder._id;
    // Create files object, update its
    var jsonProject = project.toObject();

    var filePath = path.join(nconf.get('media:upload:to'), jsonProject.file);
    var newFilePath = path.join(
      nconf.get('media:upload:to'),
      'stlproject-designs',
      jsonProject.file);
      var stats = fs.statSync(filePath);

      project.design.name = jsonProject.file;
      project.design.path = newFilePath;
      project.design.rel = path.join('stlproject-designs', jsonProject.file);
      project.design.type = 'stl';
      project.design.size = stats.size;
      project.design.lastModified = stats.mtime;

      if (jsonProject.image) {
        filePath = path.join(nconf.get('media:upload:to'), jsonProject.image);
        newFilePath = path.join(
          nconf.get('media:upload:to'),
          'stlproject-thumbnails',
          jsonProject.image);
          stats = fs.statSync(filePath);

          project.thumbnail.name = jsonProject.image;
          project.thumbnail.path = newFilePath;
          project.thumbnail.rel = path.join('stlproject-thumbnails', jsonProject.image);
          project.thumbnail.type = 'png';
          project.thumbnail.size = stats.size;
          project.thumbnail.lastModified = stats.mtime;
      }
      project.save();
  };
}

exports.up = function(next) {
  var mappingStatus = {
    1: 0,
    2: 0,
    3: 1,
    4: 2,
    5: 3,
    6: 4,
    7: 4,
    8: 5,
    9: 6,
    10: 7
  };

  Project.find({}, function (err, projects) {
    if (err) {
      return next(err);
    }

    for (var index in projects) {
      var project = projects[index];

      logger.info('Processing project: ', project._id.toString());

      // Create order
      var orderItem = {
        project: project._id,
        color: project.color,
        material: project.material,
        density: project.density,
        price: project.price,
        checkWidth: project.checkWidth,
        checkHeight: project.checkHeight,
        checkLength: project.checkLenght
      };

      var order = {
        customer: project.user,
        status: mappingStatus[project.status],
        comments: project.comments
      };

      if (project.order) {
        orderItem.amount = project.order.ammount;
        orderItem.totalPrice = project.order.price;

        order.printer = project.order.printer;
        order.placedAt = project.order.placedAt;
        order.printingStartedAt = project.order.printingStartedAt;
        order.reviewStartAt = project.order.reviewStartAt;
        order.businessPayment = project.order.businessPayment;
        order.printerPayment = project.order.printerPayment;
        order.totalPrice = project.order.totalPrice;
        order.taxes = project.order.taxes;
        order.paidToPrinter = project.order.secundaryPaid;
        order.payPaypalKey = project.order.payKey;
        order.shipping = project.order.shipping;
        order.parcel = project.order.parcel;
        order.rate = project.order.rate;
        order.transaction = project.order.transaction;
      }

      order.projects = [orderItem];

      Order.create(order, orderCallback(project, next));
    }
    next();
  });
};


exports.down = function(next) {
  next();
};
