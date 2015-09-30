/**
 *  Copyright (c) 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 */

import mongoose from 'mongoose';
import filePlugin from 'mongoose-file';
import timestamps from 'mongoose-timestamp';
import inflection from 'inflection';
import nconf from 'nconf';
import { decimal } from 'Deci-mal';

import mNotification from 'models/notification';
import getLogger from 'utils/logger';
import { PROJECT_COLORS, PROJECT_MATERIALS } from 'utils/constants';
import { NOTIFICATION_TYPES } from 'utils/constants';


let logger = getLogger('model::stlproject');
let Schema = mongoose.Schema;
let ObjectId = Schema.ObjectId;


// FIXME: This will be removed when multiorder will be implemented
// TODO: Refactor!!!!
var Comment = new Schema({
  author: {
    type: ObjectId,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  photo: {
    type: String
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    "default": Date.now
  }
});


let STLProjectSchema = new Schema({

  title: {type: String, required: true},

  volume: {type: Number},
  weight: {type: Number},
  surface: {type: Number},
  unit: {type: String},
  density: {type: Number, required: true, default: PROJECT_MATERIALS.ANY[0]},
  color: {type: String, required: true, default: PROJECT_COLORS.WHITE},
  dimension: {
    length: Number,
    height: Number,
    width: Number
  },

  user: {type: ObjectId, ref: 'User'},

  // NOTE: This maybe will be unused
  material: {type: String, default: "Any Material"},
  checkWidth: {type: Boolean, default: true},
  checkLength: {type: Boolean, default: true},
  checkHeight: {type: Boolean, default: true},

  rating: {
    type: {}
  },

  // TODO: Remove this when not need
  order_id: {type: ObjectId},

  // TODO: This should be removed later, just for compatibility
  status: {type: Number},
  price: {type: String},

  // TODO: Maybe this will be removed
  bad: {type: Boolean},
  editable: {type: Boolean},
  order: {type: {}},
  comments: {type: [Comment]}
});


/**
 * Enabling plugins
 *
 */
STLProjectSchema.plugin(timestamps);

logger.debug('Project will upload to', nconf.get('media:upload:to'));

STLProjectSchema.plugin(filePlugin.filePlugin, {
  name: 'thumbnail',
  upload_to: filePlugin.make_upload_to_model(nconf.get('media:upload:to'),
                                             'stlproject-thumbnails'),
  relative_to: nconf.get('media:upload:to')
});

STLProjectSchema.plugin(filePlugin.filePlugin, {
  name: 'design',
  upload_to: filePlugin.make_upload_to_model(nconf.get('media:upload:to'),
                                             'stlproject-designs'),
  relative_to: nconf.get('media:upload:to'),
  change_cb: function () {
    this._callbackUpload();
  }
});

// TODO: Refactor!
// Some constants
// FIXME: This will change when multiorder will be implemented
module.exports.PROJECT_STATUSES = {
  PROCESSING: [1, 'processing'],
  PROCESSED: [2, 'processed'],
  PRINT_REQUESTED: [3, 'print requested'],
  PRINT_REVIEW: [4, 'print review'],
  PRINT_ACCEPTED: [5, 'print accepted'],
  PAYED: [6, 'payed'],  // TODO: Remove when refactor was done
  PAID: [6, 'paid'], // Backward compatibility... fix typo error
  PRINTING: [7, 'printing'],
  PRINTED: [8, 'printed'],
  SHIPPING: [9, 'shipping'],
  ARCHIVED: [10, 'archived']
};

// TODO: Document What is this used for?
module.exports.PROJECT_BOUNDARIES = {
  WIDTH: [1, 'width boundary'],
  HEIGHT: [1, 'height boundary'],
  LENGTH: [1, 'lenght boundary']
};

module.exports.PROJECT_DENSITIES = {
  LOW: [0.25, 'low'],
  MEDIUM: [0.5, 'medium'],
  HIGH: [0.75, 'high'],
  COMPLETE: [1.01, 'complete']
};


/**
 * Returns the correct text used to show the user
 */
STLProjectSchema.methods.humanizedStatus = function() {
  for (var key in module.exports.PROJECT_STATUSES) {
    if (module.exports.PROJECT_STATUSES[key][0] === this.status) {
      return module.exports.PROJECT_STATUSES[key][1];
    }
  }
};

STLProjectSchema.methods.dasherizedStatus = function() {
  for (var key in module.exports.PROJECT_STATUSES) {
    if (module.exports.PROJECT_STATUSES[key][0] === this.status) {
      return inflection.dasherize(module.exports.PROJECT_STATUSES[key][1]).replace('-', '_');
    }
  }
};


// TODO: Remove this... Deprecaited in favor of queries
var PROJECT_STATUSES = module.exports.PROJECT_STATUSES;

STLProjectSchema.methods.validateNextStatus = function(value) {
  var states;
  states = {
    1: [PROJECT_STATUSES.PROCESSED[0]],
    2: [PROJECT_STATUSES.PROCESSING[0], PROJECT_STATUSES.PRINT_REQUESTED[0]],
    3: [PROJECT_STATUSES.PRINT_REVIEW[0]],
    4: [PROJECT_STATUSES.PRINT_ACCEPTED[0], PROJECT_STATUSES.PRINT_REQUESTED[0]],
    5: [PROJECT_STATUSES.PAYED[0]],
    6: [PROJECT_STATUSES.PRINTING[0]],
    7: [PROJECT_STATUSES.PRINTED[0]],
    8: [PROJECT_STATUSES.SHIPPING[0], PROJECT_STATUSES.ARCHIVED[0]],
    9: [PROJECT_STATUSES.ARCHIVED[0]]
  };
  return (states[this.status].indexOf(value) >= 0);
};

STLProjectSchema.methods.validNextStatus = function() {
  var states;
  states = {
    1: [PROJECT_STATUSES.PROCESSED],
    2: [PROJECT_STATUSES.PROCESSING, PROJECT_STATUSES.PRINT_REQUESTED],
    3: [PROJECT_STATUSES.PRINT_REVIEW],
    4: [PROJECT_STATUSES.PRINT_ACCEPTED, PROJECT_STATUSES.PRINT_REQUESTED],
    5: [PROJECT_STATUSES.PAYED],
    6: [PROJECT_STATUSES.PRINTING],
    7: [PROJECT_STATUSES.PRINTED],
    8: [PROJECT_STATUSES.SHIPPING, PROJECT_STATUSES.ARCHIVED],
    9: [PROJECT_STATUSES.ARCHIVED]
  };
  return states[this.status];
};

STLProjectSchema.virtual('orderPrice').get(function() {
  if (this.order.rate != null) {
    return decimal.fromNumber(parseFloat(this.order.totalPrice) + parseFloat(this.order.rate.amount), 2).toString();
  } else {
    return this.order.totalPrice;
  }
});

STLProjectSchema.post('save', function(doc) {
  if (doc.status === module.exports.PROJECT_STATUSES.SHIPPING[0]) {
    return mailer.send('mailer/printer/feedback', {
      project: doc
    }, {
      from: nconf.get('admin:emails'),
      to: doc.creator,
      subject: "Printing work feedback"
    });
  }
});

module.exports.STLProject = mongoose.model('STLProject', STLProjectSchema);
module.exports.Comment = mongoose.model('Comment', Comment);

// FIXME: Improve this one
STLProjectSchema.pre('save', function(next) {
  var now, that, _ref;
  this.editable = (_ref = this.status) === module.exports.PROJECT_STATUSES.PROCESSED[0] || _ref === module.exports.PROJECT_STATUSES.PRINT_REVIEW[0];
  now = new Date();
  if (!this.createdAt) {
    this.createdAt = now;
  }
  that = this;
  module.exports.STLProject.findOne({
    _id: this.id
  }).exec().then(function(doc) {
    var notif;
    if (doc.status !== that.status && doc.status !== 1) {
      notif = new mNotification.Notification();
      notif.type = NOTIFICATION_TYPES.STATUS_CHANGED[0];
      notif.creator = that.id;
      notif.title = that.title;
      notif.recipient = that.user;
      notif.refertourl = "/project/" + that.id;
      return notif.save();
    }
  });
  return next();
});

module.exports.STLProject.schema.path('color').validate(function(value) {
  if (value == null) {
    return true;
  }
  return /black|white|yellow|red|blue|green/i.test(value);
}, 'Invalid Color');

module.exports.STLProject.schema.path('density').validate(function(value) {
  if (value == null) {
    return true;
  }
  return value === PROJECT_MATERIALS.ABS[0] || value === PROJECT_MATERIALS.PLA[0];
}, 'Invalid Density');

/*
# Validations
*/
module.exports.STLProject.schema.path('status').validate(function(value) {
  return this.status != null;
  return this.validateNextStatus(value);
}, 'Invalid next step');
