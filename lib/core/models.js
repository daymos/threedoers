(function() {

  // start backward compatibility
  var mProject = require('models/project');
  var constants = require('utils/constants');

module.exports.PROJECT_STATUSES = mProject.PROJECT_STATUSES;
module.exports.PROJECT_BOUNDARIES = mProject.PROJECT_BOUNDARIES;
module.exports.PROJECT_COLORS = constants.PROJECT_COLORS;
module.exports.PROJECT_DENSITIES = mProject.PROJECT_DENSITIES;
module.exports.PROJECT_MATERIALS = constants.PROJECT_MATERIALS;
module.exports.STLProject = mProject.STLProject;
module.exports.Comment = mProject.Comment;

  // Old code

 var mongoose = require('mongoose');

 var models = require('./models');
 var modelsNot = require('../notification/models');
 var mailer = require('../mailer').mailer;
 var settings = require('../../config');
 var Schema = mongoose.Schema;
 var ObjectId = Schema.ObjectId;


 var Subscription = new Schema({
    email: {
      type: String,
      required: true,
      index: {
        unique: true
      }
    }
  });

  module.exports.Subscription = mongoose.model('Subscription', Subscription);
}).call(this);
