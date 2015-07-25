/**
 *  Copyright (c) 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 */

var mongoose = require('mongoose');
var inflection = require('inflection');
var nconf = require('nconf');
var decimal = require('Deci-mal').decimal;

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var mNotification = require('models/notification');


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

module.exports.PROJECT_COLORS = {
  BLACK: 'black',
  WHITE: 'white',
  YELLOW: 'yellow',
  RED: 'red',
  BLUE: 'blue',
  GREEN: 'green'
};

module.exports.PROJECT_DENSITIES = {
  LOW: [0.25, 'low'],
  MEDIUM: [0.5, 'medium'],
  HIGH: [0.75, 'high'],
  COMPLETE: [1.01, 'complete']
};

module.exports.PROJECT_MATERIALS = {
  ANY: [1.01, 'Any Material'],
  ABS: [1.01, 'ABS'],
  PLA: [1.24, 'PLA']
};

// FIXME: This will be removed when multiorder will be implemented
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


var STLProject = new Schema({

  title: {
    type: String,
    required: true,
    "default": "Untitled Project"
  },

  file: {
    type: String,
    required: true
  },

  image: {
    type: String
  },

  volume: {
    type: Number
  },

  density: {
    type: Number,
    "default": module.exports.PROJECT_MATERIALS.ANY[0],
    required: true
  },

  weight: {
    type: Number
  },

  surface: {
    type: Number
  },

  unit: {
    type: String
  },

  status: {
    type: Number,
    "default": module.exports.PROJECT_STATUSES.PROCESSING[0],
    required: true
  },

  user: {
    type: ObjectId,
    required: false
  },

  color: {
    type: String,
    required: true,
    "default": module.exports.PROJECT_COLORS.WHITE
  },

  price: {
    type: String,
    required: true,
    "default": '0.0'
  },

  // TODO: Maybe this will be removed
  bad: {
    type: Boolean,
    "default": false
  },

  editable: {
    type: Boolean,
    "default": true
  },

  material: {
    type: String,
    "default": "Any Material"
  },

  order: {
    type: {}
  },

  dimension: {
    type: {}
  },

  comments: {
    type: [Comment]
  },

  createdAt: {
    type: Date
  },

  checkWidth: {
    type: Boolean,
    "default": true
  },

  checkLenght: {
    type: Boolean,
    "default": true
  },

  checkHeight: {
    type: Boolean,
    "default": true
  },

  rating: {
    type: {}
  }
});


/**
 * Returns the correct text used to show the user
 */
STLProject.methods.humanizedStatus = function() {
  for (var key in module.exports.PROJECT_STATUSES) {
    if (module.exports.PROJECT_STATUSES[key][0] === this.status) {
      return module.exports.PROJECT_STATUSES[key][1];
    }
  }
};

STLProject.methods.dasherizedStatus = function() {
  for (var key in module.exports.PROJECT_STATUSES) {
    if (module.exports.PROJECT_STATUSES[key][0] === this.status) {
      return inflection.dasherize(module.exports.PROJECT_STATUSES[key][1]).replace('-', '_');
    }
  }
};


// TODO: Remove this... Deprecaited in favor of queries
var PROJECT_STATUSES = module.exports.PROJECT_STATUSES;

STLProject.methods.validateNextStatus = function(value) {
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

STLProject.methods.validNextStatus = function() {
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

STLProject.virtual('orderPrice').get(function() {
  if (this.order.rate != null) {
    return decimal.fromNumber(parseFloat(this.order.totalPrice) + parseFloat(this.order.rate.amount), 2).toString();
  } else {
    return this.order.totalPrice;
  }
});

STLProject.post('save', function(doc) {
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

module.exports.STLProject = mongoose.model('STLProject', STLProject);
module.exports.Comment = mongoose.model('Comment', Comment);

// FIXME: Improve this one
STLProject.pre('save', function(next) {
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
      notif.type = mNotification.NOTIFICATION_STATE.CHANGE_STATUS[0];
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
