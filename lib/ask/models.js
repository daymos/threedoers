(function() {
  var ObjectId, STLDesign, Schema, gridfs, inflection, mongoose;

  mongoose = require('mongoose');

  gridfs = require('../gridfs');

  inflection = require('inflection');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  STLDesign = new Schema({
    read: {
      type: Boolean,
      "default": false
    },
    creator: {
      type: ObjectId,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    createAt: {
      type: Date,
      "default": Date.now
    },
    recipient: {
      type: ObjectId,
      required: true
    },
    refertourl: {
      type: String,
      require: true
    }
  });

  module.exports.STLDesign = mongoose.model('STLDesign', STLDesign);

}).call(this);
