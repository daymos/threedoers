(function() {
  var ObjectId, STLProject, Schema, gridfs, mongoose;

  mongoose = require('mongoose');

  gridfs = require('../gridfs');

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  STLProject = new Schema({
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
    processed: {
      type: Boolean,
      "default": false,
      required: true
    },
    user: {
      type: ObjectId,
      required: true
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

  module.exports.STLProject = mongoose.model('STLProject', STLProject);

}).call(this);
