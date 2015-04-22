(function() {
  var ObjectId, Schema, WorkSession, gridfs, inflection, mongoose;

  mongoose = require('mongoose');

  gridfs = require('../gridfs');

  inflection = require('inflection');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  WorkSession = new Schema({
    session_project_id: {
      type: ObjectId,
      required: true
    },
    session_number: {
      type: Number
    },
    session_date_stamp: {
      type: Date
    },
    session_screen_shot: {
      type: String
    }
  });

  module.exports.WorkSession = mongoose.model('WorkSession', WorkSession);

}).call(this);
