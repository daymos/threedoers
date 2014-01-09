(function() {
  var Grid, GridStore, ObjectID, mongoose, parse, q, request,
    __slice = [].slice;

  mongoose = require("mongoose");

  request = require("request");

  q = require("q");

  GridStore = mongoose.mongo.GridStore;

  Grid = mongoose.mongo.Grid;

  ObjectID = mongoose.mongo.BSONPure.ObjectID;

  exports.putFile = function() {
    var db, deferred, name, options, path;
    path = arguments[0], name = arguments[1], options = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
    deferred = q.defer();
    db = mongoose.connection.db;
    options = parse(options);
    options.metadata.filename = name;
    new GridStore(db, name, "w", options).open(function(err, file) {
      if (err) {
        return deferred.reject(err);
      } else {
        return file.writeFile(path, function(err, doc) {
          if (err) {
            return deferred.reject(err);
          } else {
            return deferred.resolve(doc);
          }
        });
      }
    });
    return deferred.promise;
  };

  exports.getFile = function(id) {
    var db, deferred, store;
    deferred = q.defer();
    db = mongoose.connection.db;
    store = new GridStore(db, id, "r", {
      root: "fs"
    });
    store.open(function(err, store) {
      if (err) {
        deferred.reject(err);
      }
      if (("" + store.filename) === ("" + store.fileId) && store.metadata && store.metadata.filename) {
        store.filename = store.metadata.filename;
      }
      return deferred.resolve(store);
    });
    return deferred.promise;
  };

  parse = function(options) {
    var opts;
    opts = {};
    if (options.length > 0) {
      opts = options[0];
    }
    if (!opts.metadata) {
      opts.metadata = {};
    }
    return opts;
  };

}).call(this);
