/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

// Third party modules
import nconf from 'nconf';
import HTTPStatus from 'http-status';
import fs from 'fs';

// Model modules
import mProjects from 'models/project';
import mUsers from 'models/user';

// React components
import React from 'react';
import Router from 'react-router';
import routes from 'components/routes.jsx';

// Extra modules
import getLogger from 'utils/logger';
import Order from 'models/order';
import * as OrderUtils from 'utils/order';
import {orderChannel} from 'controllers/primus';

// Other globals
let logger = getLogger('controller::printing');


/**
 *  Utility methods
 */

export let paramProject = function paramProject (req, res, next, projectID) {
  let query = mProjects.STLProject.findOne({_id: projectID});

  query.exec(function(err, project) {
    if (err) { return next(err); }

    if (project) {
      // FIXME: Modify this when multiorder is ready
      let canSee = req.user && req.user._id.equals(project.user);
      canSee = canSee ||
        (req.session.projects &&
         req.session.projects.indexOf(project._id.toHexString()) === -1);

      if (!canSee) {
        let error;
        error = new Error('You don\'t have permission to see this project.');
        error.status = HTTPStatus.FORBIDDEN;
        return next(error);
      }

      req.project = project;
      next();
    } else {
      let error = new Error('Project not found.');
      error.status = HTTPStatus.NOT_FOUND;
      return next(error);
    }
  });
};


/**
 * Controllers
 */

/**
 * @description Upload a file and start processing it.
 *
 * If has an orderID param will set relationship to it, if not will
 * create an order.
 */

// TODO: Only normal user can upload a project!!
export let uploadProject = function uploadProject(req, res, next) {
  if (req.files.design.size === 0) {
    let error = new Error();
    error.status = HTTPStatus.BAD_REQUEST;
    error.fields = {
      design: 'File does not contains data.'
    };
    fs.unlink(req.files.design.path);
    return next(error);
  } else if (req.files.design.extension.toLowerCase() !== 'stl') {
    let error = new Error();
    error.status = HTTPStatus.BAD_REQUEST;
    error.fields = {
      design: 'Is not and STL file.'
    };
    fs.unlink(req.files.design.path);
    return next(error);
  } else {
    let projectValues = {
      title: req.files.design.originalname.split('.')[0],
      user: req.user ? req.user._id : undefined
    };
    let project = new mProjects.STLProject(projectValues);
    project.design.file = req.files.design;

    // to handle on design data is ready to be saved.
    project._callbackUpload = function () {
      project.save(function (saveProjectError, newProject) {
        if (saveProjectError) {
          return next(saveProjectError);
        }

        if (req.params.orderID) {

          let item = {
            project: newProject._id,
            color: newProject.color,
            material: newProject.material,
            density: newProject.density,
            price: 0,
            checkWidth: newProject.checkWidth,
            checkHeight: newProject.checkHeight,
            checkLength: newProject.checkLenght
          };

          req.order.projects.push(item);

          req.order.save(function (saveOrderError, order) {
            if (saveOrderError) {
              return next(saveOrderError);
            } else {
              res.status(HTTPStatus.CREATED);

              let _item = order.projects[order.projects.length - 1];
              _item.project = newProject;

              let resItem = _item.toObject();
              resItem.project = newProject;
              res.send(resItem);

              OrderUtils.processOrderItem(_item, req.params.orderID);
            }
          });
        } else {
          let order = {
            projects: [{
              project: newProject._id,
              color: newProject.color,
              material: newProject.material,
              density: newProject.density,
              price: 0,
              checkWidth: newProject.checkWidth,
              checkHeight: newProject.checkHeight,
              checkLength: newProject.checkLenght
            }],

            customer: req.user ? req.user._id : undefined
          };

          Order.create(order, function (createOrderError, newOrder) {
            if (createOrderError) {
              return next(createOrderError);
            } else {
              if (!req.user) {
                req.session.orders = req.session.orders || [];
                req.session.orders.push(newOrder._id.toHexString());
              }
              res.status(HTTPStatus.CREATED);
              res.send({id: newOrder._id});

              let item = newOrder.projects[newOrder.projects.length - 1];
              item.project = newProject;

              OrderUtils.processOrderItem(item, req.params.orderID);
            }
          });
        }
      });
    };
  }
};

// Pending to refactor

exports.projectDetail = function projectDetail(req, res, next) {

  if (req.project.order_id) {
    res.redirect(`/order/${req.project.order_id}`);
  } else {
    res.redirect(`/`);
  }

  // var e, filterDict;
  //      if (req.user) {
  //        notificationModels.Notification.update({
  //          recipient: req.user.id,
  //          relatedObject: req.params.id,
  //          type: 1,
  //          read: false
  //        }, {
  //          read: true
  //        }).exec();
  //      }
  //      return models.STLProject.findOne(filterDict).exec().then(function(doc) {
  //        if (doc) {
  //          if (!doc.volume || doc.bad || !doc.dimension) {
  //            processVolumeWeight(doc);
  //          }
  //          if (doc.order && doc.order.printer) {
  //            return auth.User.findOne({
  //              _id: doc.order.printer
  //            }).exec().then(function(printer) {
  //              return res.render('core/project/detail', {
  //                project: doc,
  //                printer: printer,
  //                colors: models.PROJECT_COLORS,
  //                materials: models.PROJECT_MATERIALS,
  //                statuses: models.PROJECT_STATUSES,
  //                countries: auth.EuropeCountries
  //              });
  //            });
  //          } else {
  //            return res.render('core/project/detail', {
  //              project: doc,
  //              colors: models.PROJECT_COLORS,
  //              materials: models.PROJECT_MATERIALS,
  //              statuses: models.PROJECT_STATUSES,
  //              countries: auth.EuropeCountries
  //            });
  //          }
  //        } else {
  //          return next();
  //        }
  //      }).fail(function(reason) {
  //        console.log(arguments);
  //        return res.send(500);
  //      });
  //    });

};


exports.projectDetailAPI = function projectDetail(req, res, next) {
    if (req.project.order && req.project.order.printer) {
      // TODO: Remove this logic when working with multiorders
      mUsers.User.findOne({id: req.project.order.printer}).exec(function (error, printer) {
        if (error) { return next(error); }
        let project = req.project.toJSON();
        project.order.printer = printer.toJSON();
        return res.json(project);
      });
    } else {
        return res.json(req.project.toJSON());
    }
};
