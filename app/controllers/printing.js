/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

// Third party modules
import winston from 'winston'
import HTTPStatus from "http-status"

// Model modules
import mProjects from 'models/project'
import mUsers from 'models/user'


/**
 *  Utility methods
 */

exports.paramProject = function paramProject (req, res, next, project) {
  /**
   * This method should be used in express app as param that will be used in all views
   * that needs a project inside.
   *
   *  1 Will display the project if anonymous and session has the rights to see it.
   *  2 Will display the project if user is printer and project has the status to se
   *    visible for printer.
   *  3 Will display the project for owner or admin.
   */

  let query = mProjects.STLProject.findOne({_id: project});

  // FIXME: req.user.printer is backward compatibility remove later!
  if (req.user && !(req.user.isPrinter && req.user.printer === 'accepted')) {
    // Test if normal user so ask for ownership
    query.where('user').equals(req.user.id)
  }

  query.exec(function(err, project) {
    if (err) return next(err);

    if (project) {
      // Test if printer has rights to see
      // FIXME: req.user.printer is backward compatibility remove later!
      let ifQuery = req.user && req.user.isPrinter && req.user.printer === 'accepted';

      // FIXME: Modify this when multiorder is ready
      ifQuery = project.order && project.order.printer && !req.user.id.equal(project.order.printer);

      if (ifQuery) {
        let error = new Error('You don\'t have permission to see this');
        error.status = HTTPStatus.FORBIDDEN;
        return next(error);
      }

      // TODO: Test if anonymous user has permission

      req.project = project;
      next();
    } else {
      let error = new Error("Project not found.");
      error.status = HTTPStatus.NOT_FOUND;
      return next(error)
    }
  });
}


/**
 * Controllers
 */

exports.projectDetail = function projectDetail(req, res, next) {
  res.render('printing/project.html');
  // Process project if not processed
  if (!req.project.volume || req.project.bad || !req.project.dimension) {
    processVolumeWeight(req.project);
  }

  if (req.project.order && req.project.order.printer) {
    // TODO: Remove this logic when working with multiorders
    mUser.findOne({id: req.project.order.printer}).exec(function (error, printer) {
      if (error) return next(error);


    });
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

}
