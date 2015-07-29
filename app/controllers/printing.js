/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

// Third party modules
import nconf from 'nconf';
import HTTPStatus from "http-status";

// Model modules
import mProjects from 'models/project';
import mUsers from 'models/user';

// React components
import React from 'react';
import Router from 'react-router';
import routes from 'components/routes.jsx';

// Extra modules
import getLogger from 'utils/logger';


// Other globals
let logger = getLogger('printing');


/**
 *  Utility methods
 */

exports.paramProject = function paramProject (req, res, next, projectID) {
  /**
   * This method should be used in express app as param that will be used in all views
   * that needs a project inside.
   *
   *  1 Will display the project if anonymous and session has the rights to see it.
   *  2 Will display the project if user is printer and project has the status to se
   *    visible for printer.
   *  3 Will display the project for owner or admin.
   */

  let query = mProjects.STLProject.findOne({_id: projectID});

  // FIXME: req.user.printer is backward compatibility remove later!
  /*
  if (req.user && !(req.user.isPrinter && req.user.printer === 'accepted')) {
    // Test if normal user so ask for ownership
    query.where('user').equals(req.user.id)
  }
  */

  query.exec(function(err, project) {
    if (err) { return next(err); }

    if (project) {
      // Test if printer has rights to see
      // FIXME: req.user.printer is backward compatibility remove later!
      let isPrinter = req.user && req.user.isPrinter && req.user.printer === 'accepted';

      // FIXME: Modify this when multiorder is ready
      let canSee = isPrinter && project.order && project.order.printer && req.user._id.equals(project.order.printer);
      canSee = canSee || (req.user && req.user._id.equals(project.user));
      canSee = canSee || (req.session.projects && req.session.projects.indexOf(project._id.toHexString()) === -1);

      if (!canSee) {
        let error = new Error('You don\'t have permission to see this project.');
        error.status = HTTPStatus.FORBIDDEN;
        return next(error);
      }

      req.project = project;
      next();
    } else {
      let error = new Error("Project not found.");
      error.status = HTTPStatus.NOT_FOUND;
      return next(error);
    }
  });
};


/**
 * Controllers
 */

exports.projectDetail = function projectDetail(req, res, next) {
  // Process project if not processed
  if (!req.project.volume || req.project.bad || !req.project.dimension) {
    processVolumeWeight(req.project);
  }

  Router.run(routes, req.originalUrl, function (Root, state) {
    if (req.project.order && req.project.order.printer) {
      // TODO: Remove this logic when working with multiorders
      mUser.findOne({id: req.project.order.printer}).exec(function (error, printer) {
        if (error) { return next(error); }

        let props = {
          project: req.project.toJSON(),
          printer: printer.toJSON()
        };
        let reactHTML = React.renderToString(<Root project={req.project} printer={req.printer} />);
        return res.render('printing/project.html', {reactHTML});
      });
    } else {
        let reactHTML = React.renderToString(<Root project={req.project} />);
        return res.render('printing/project.html', {reactHTML});
    }
  });
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
