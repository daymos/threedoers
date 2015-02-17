(function() {
  var DESIGN_STATUSES, ObjectId, STLDesign, Schema, gridfs, inflection, mongoose;

  mongoose = require('mongoose');

  gridfs = require('../gridfs');

  inflection = require('inflection');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  module.exports.DESIGN_STATUSES = DESIGN_STATUSES = {
    PROCESSING: [1, 'processing'],
    PROCESSED: [2, 'processed'],
    PRINT_REQUESTED: [3, 'print requested'],
    PRINT_REVIEW: [4, 'print review'],
    PRINT_ACCEPTED: [5, 'print accepted'],
    PAYED: [6, 'payed'],
    PRINTING: [7, 'printing'],
    PRINTED: [8, 'printed'],
    SHIPPING: [9, 'shipping'],
    ARCHIVED: [10, 'archived']
  };

  STLDesign = new Schema({
    creator: {
      type: ObjectId,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    abstract: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    status: {
      type: Number,
      "default": DESIGN_STATUSES.PROCESSING[0],
      required: true
    },
    order: {
      type: {}
    },
    createAt: {
      type: Date,
      "default": Date.now
    },
    resources: {
      type: [String],
      require: true
    }
  });

  STLDesign.methods.humanizedStatus = function() {
    var key;
    for (key in DESIGN_STATUSES) {
      console.log(this.status);
      if (DESIGN_STATUSES[key][0] === this.status) {
        return DESIGN_STATUSES[key][1];
      }
    }
  };

  STLDesign.methods.dasherizedStatus = function() {
    var key;
    for (key in DESIGN_STATUSES) {
      if (DESIGN_STATUSES[key][0] === this.status) {
        return inflection.dasherize(DESIGN_STATUSES[key][1]).replace('-', '_');
      }
    }
  };

  module.exports.STLDesign = mongoose.model('STLDesign', STLDesign);

}).call(this);
