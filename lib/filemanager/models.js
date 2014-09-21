(function() {
  var Comment, FileProject, ObjectId, PROJECT_STATUSES, Schema, gridfs, inflection, mongoose,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  mongoose = require('mongoose');

  gridfs = require('../gridfs');

  inflection = require('inflection');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  module.exports.PROJECT_STATUSES = PROJECT_STATUSES = {
    UPLOADED: [1, 'uploaded'],
    PREACCEPTED: [2, 'preaccepted'],
    ACCEPTED: [3, 'accpeted'],
    PAID: [4, 'paid'],
    FINISHED: [5, 'finished']
  };

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

  FileProject = new Schema({
    title: {
      type: String,
      required: true,
      "default": "Untitled Project"
    },
    original_file: {
      type: String,
      required: true
    },
    reviewed_file: {
      type: String
    },
    image: {
      type: String
    },
    status: {
      type: Number,
      "default": PROJECT_STATUSES.UPLOADED[0],
      required: true
    },
    user: {
      type: ObjectId,
      required: true
    },
    price: {
      type: String,
      required: true,
      "default": '15.0'
    },
    comments: {
      type: [Comment]
    },
    filemanager: {
      type: String
    },
    createdAt: {
      type: Date
    }
  });

  FileProject.methods.humanizedStatus = function() {
    var key;
    for (key in PROJECT_STATUSES) {
      if (PROJECT_STATUSES[key][0] === this.status) {
        return PROJECT_STATUSES[key][1];
      }
    }
  };

  FileProject.methods.dasherizedStatus = function() {
    var key;
    for (key in PROJECT_STATUSES) {
      if (PROJECT_STATUSES[key][0] === this.status) {
        return inflection.dasherize(PROJECT_STATUSES[key][1]).replace('-', '_');
      }
    }
  };

  FileProject.methods.validateNextStatus = function(value) {
    var states;
    states = {
      1: [PROJECT_STATUSES.PREACCEPTED[0]],
      2: [PROJECT_STATUSES.ACCEPTED[0], PROJECT_STATUSES.UPLOADED[0]],
      3: [PROJECT_STATUSES.PAID[0]],
      4: [PROJECT_STATUSES.FINISHED[0]]
    };
    return __indexOf.call(states[this.status], value) >= 0;
  };

  FileProject.methods.validNextStatus = function() {
    var states;
    states = {
      1: [PROJECT_STATUSES.PREACCEPTED],
      2: [PROJECT_STATUSES.ACCEPTED, PROJECT_STATUSES.UPLOADED],
      3: [PROJECT_STATUSES.PAID],
      4: [PROJECT_STATUSES.FINISHED]
    };
    return states[this.status];
  };

  FileProject.pre('save', function(next) {
    var now;
    now = new Date();
    if (!this.createdAt) {
      this.createdAt = now;
    }
    return next();
  });

  module.exports.FileProject = mongoose.model('FileProject', FileProject);

  module.exports.FileProject.schema.path('status').validate(function(value) {
    return this.status != null;
    return this.validateNextStatus(value);
  });

}).call(this);
