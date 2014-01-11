(function() {
  var ObjectId, PROJECT_STATUSES, STLProject, Schema, gridfs, mongoose,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  mongoose = require('mongoose');

  gridfs = require('../gridfs');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  module.exports.PROJECT_STATUSES = PROJECT_STATUSES = {
    PROCESSING: [1, 'processing'],
    PROCESSED: [2, 'processed'],
    PRINT_REQUESTED: [3, 'print requested'],
    PRINT_ACCEPTED: [4, 'print accepted'],
    PRINT_DENIED: [5, 'print denied'],
    PAYED: [6, 'print accepted'],
    PRINTING: [7, 'printing'],
    PRINTED: [8, 'printed'],
    SHIPPING: [9, 'shipping']
  };

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
      "default": 1.04,
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
    bad: {
      type: Boolean,
      "default": false
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

  STLProject.methods.validateNextStatus = function(value) {
    var states;
    states = {
      1: [PROJECT_STATUSES.PROCESSED[0]],
      2: [PROJECT_STATUSES.PROCESSING[0], PROJECT_STATUSES.PRINT_REQUESTED[0]],
      3: [PROJECT_STATUSES.PRINT_ACCEPTED[0], PROJECT_STATUSES.PRINT_DENIED[0]],
      4: [PROJECT_STATUSES.PAYED[0]],
      5: [PROJECT_STATUSES.PROCESSING[0], PROJECT_STATUSES.PROCESSED[0]],
      6: [PROJECT_STATUSES.PRINTING[0]],
      7: [PROJECT_STATUSES.PRINTED[0]],
      8: [PROJECT_STATUSES.SHIPPING[0]]
    };
    return __indexOf.call(states[this.status], value) >= 0;
  };

  STLProject.pre('save', function(next) {
    var _ref;
    this.editable = (_ref = this.status) === PROJECT_STATUSES.PROCESSED[0] || _ref === PROJECT_STATUSES.PRINT_DENIED[0];
    return next();
  });

  module.exports.STLProject = mongoose.model('STLProject', STLProject);

  /*
  # Validations
  */


  module.exports.STLProject.schema.path('status').validate(function(value) {
    return this.status != null;
    return this.validateNextStatus(value);
  }, 'Invalid next step');

}).call(this);
