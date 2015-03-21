(function() {
  var Comment, DESIGN_STATUSES, ObjectId, Proposal, STLDesign, Schema, gridfs, inflection, modelComment, models, mongoose;

  mongoose = require('mongoose');

  gridfs = require('../gridfs');

  inflection = require('inflection');

  models = require('./models');

  modelComment = require('../core/models');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  module.exports.DESIGN_STATUSES = DESIGN_STATUSES = {
    UPLOADED: [1, 'uploaded'],
    PREACCEPTED: [2, 'preaccepted'],
    ACCEPTED: [3, 'accepted'],
    PAID: [4, 'payed'],
    TIMEEEXPIRED: [5, 'time expired'],
    DELIVERED: [6, 'delivered'],
    ARCHIVED: [7, 'archived']
  };

  Proposal = new Schema({
    creator: {
      type: ObjectId,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    backref: {
      type: ObjectId,
      require: true
    },
    rejected: {
      type: Boolean,
      "default": false
    },
    hour: {
      type: Number,
      required: true
    },
    cost: {
      type: Number,
      required: true
    },
    createAt: {
      type: Date,
      "default": Date.now
    },
    accepted: {
      type: Boolean,
      "default": false
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
    order: {
      type: {}
    },
    status: {
      type: Number,
      "default": DESIGN_STATUSES.UPLOADED[0],
      required: true
    },
    proposal: {
      type: [Proposal]
    },
    createAt: {
      type: Date,
      "default": Date.now
    },
    comments: {
      type: [Comment]
    },
    designer: {
      type: String
    },
    project_total_time_logged: {
      type: Number,
      "default": 0
    },
    resources: {
      type: [String],
      require: true
    }
  });

  STLDesign.methods.humanizedStatus = function() {
    var key;
    for (key in DESIGN_STATUSES) {
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

  module.exports.Proposal = mongoose.model('Proposal', Proposal);

}).call(this);
