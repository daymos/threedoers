(function() {
  var Comment, ObjectId, PROJECT_COLORS, PROJECT_DENSITIES, PROJECT_STATUSES, STLProject, Schema, Subscription, gridfs, inflection, mongoose,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  mongoose = require('mongoose');

  gridfs = require('../gridfs');

  inflection = require('inflection');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  module.exports.PROJECT_STATUSES = PROJECT_STATUSES = {
    PROCESSING: [1, 'processing'],
    PROCESSED: [2, 'processed'],
    PRINT_REQUESTED: [3, 'print requested'],
    PRINT_ACCEPTED: [4, 'print accepted'],
    PAYED: [5, 'payed'],
    PRINTING: [6, 'printing'],
    PRINTED: [7, 'printed'],
    SHIPPING: [8, 'shipping'],
    ARCHIVED: [9, 'archived']
  };

  module.exports.PROJECT_COLORS = PROJECT_COLORS = {
    BLACK: 'black',
    WHITE: 'white',
    YELLOW: 'yellow',
    RED: 'red',
    BLUE: 'blue',
    GREEN: 'green'
  };

  module.exports.PROJECT_DENSITIES = PROJECT_DENSITIES = {
    LOW: [0.25, 'low'],
    MEDIUM: [0.5, 'medium'],
    HIGH: [0.75, 'high'],
    COMPLETE: [1, 'complete']
  };

  Subscription = new Schema({
    email: {
      type: String,
      required: true,
      index: {
        unique: true
      }
    }
  });

  Comment = new Schema({
    author: {
      type: ObjectId,
      required: true
    },
    username: {
      type: String,
      required: true
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

  STLProject = new Schema({
    title: {
      type: String,
      required: true,
      "default": "Untitled Project"
    },
    file: {
      type: String,
      required: true
    },
    volume: {
      type: Number
    },
    density: {
      type: Number,
      "default": PROJECT_DENSITIES.COMPLETE[0],
      required: true
    },
    weight: {
      type: Number
    },
    unit: {
      type: String
    },
    status: {
      type: Number,
      "default": PROJECT_STATUSES.PROCESSING[0],
      required: true
    },
    user: {
      type: ObjectId,
      required: true
    },
    color: {
      type: String,
      required: true,
      "default": PROJECT_COLORS.WHITE
    },
    price: {
      type: String,
      required: true,
      "default": '0.0'
    },
    bad: {
      type: Boolean,
      "default": false
    },
    editable: {
      type: Boolean,
      "default": true
    },
    order: {
      type: {}
    },
    comments: {
      type: [Comment]
    },
    createdAt: {
      type: Date
    }
  });

  STLProject.methods.addFile = function(file, options) {
    var name,
      _this = this;
    name = file.path.split('/').pop();
    return gridfs.putFile(file.path, name, options).then(function(doc) {
      return _this.file = doc.filename;
    });
  };

  STLProject.methods.humanizedStatus = function() {
    var key;
    for (key in PROJECT_STATUSES) {
      if (PROJECT_STATUSES[key][0] === this.status) {
        return PROJECT_STATUSES[key][1];
      }
    }
  };

  STLProject.methods.dasherizedStatus = function() {
    var key;
    for (key in PROJECT_STATUSES) {
      if (PROJECT_STATUSES[key][0] === this.status) {
        return inflection.dasherize(PROJECT_STATUSES[key][1]).replace('-', '_');
      }
    }
  };

  STLProject.methods.validateNextStatus = function(value) {
    var states;
    states = {
      1: [PROJECT_STATUSES.PROCESSED[0]],
      2: [PROJECT_STATUSES.PROCESSING[0], PROJECT_STATUSES.PRINT_REQUESTED[0]],
      3: [PROJECT_STATUSES.PRINT_ACCEPTED[0]],
      4: [PROJECT_STATUSES.PAYED[0]],
      5: [PROJECT_STATUSES.PRINTING[0]],
      6: [PROJECT_STATUSES.PRINTED[0]],
      7: [PROJECT_STATUSES.SHIPPING[0]]
    };
    return __indexOf.call(states[this.status], value) >= 0;
  };

  STLProject.methods.validNextStatus = function() {
    var states;
    states = {
      1: [PROJECT_STATUSES.PROCESSED],
      2: [PROJECT_STATUSES.PROCESSING, PROJECT_STATUSES.PRINT_REQUESTED],
      3: [PROJECT_STATUSES.PRINT_ACCEPTED],
      4: [PROJECT_STATUSES.PAYED],
      5: [PROJECT_STATUSES.PRINTING],
      6: [PROJECT_STATUSES.PRINTED],
      7: [PROJECT_STATUSES.SHIPPING]
    };
    return states[this.status];
  };

  STLProject.pre('save', function(next) {
    var now, _ref;
    this.editable = (_ref = this.status) === PROJECT_STATUSES.PROCESSED[0];
    now = new Date();
    if (!this.createdAt) {
      this.createdAt = now;
    }
    return next();
  });

  module.exports.Subscription = mongoose.model('Subscription', Subscription);

  module.exports.STLProject = mongoose.model('STLProject', STLProject);

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
    return value === PROJECT_DENSITIES.LOW[0] || value === PROJECT_DENSITIES.MEDIUM[0] || value === PROJECT_DENSITIES.HIGH[0] || value === PROJECT_DENSITIES.COMPLETE[0] || value === 1.04;
  }, 'Invalid Density');

  /*
  # Validations
  */


  module.exports.STLProject.schema.path('status').validate(function(value) {
    return this.status != null;
    return this.validateNextStatus(value);
  }, 'Invalid next step');

}).call(this);
