mongoose = require "mongoose"
request = require "request"
q = require "q"

GridStore = mongoose.mongo.GridStore
Grid = mongoose.mongo.Grid
ObjectID = mongoose.mongo.BSONPure.ObjectID


exports.putFile = (path, name, options...) ->
  deferred = q.defer()

  db = mongoose.connection.db
  options = parse(options)
  options.metadata.filename = name

  new GridStore(db, name, "w", options).open (err, file) ->
    if err
      deferred.reject err
    else
      file.writeFile path, (err, doc) ->
        if err
          deferred.reject err
        else
          deferred.resolve doc

  deferred.promise


exports.getFile = (id) ->
  deferred = q.defer()

  db = mongoose.connection.db

  store = new GridStore(db, id, "r",
    root: "fs"
  )
  store.open (err, store) ->

    if err
      deferred.reject err
    # band-aid
    if "#{store.filename}" == "#{store.fileId}" and store.metadata and store.metadata.filename
      store.filename = store.metadata.filename

    deferred.resolve store

  deferred.promise


parse = (options) ->
  opts = {}
  if options.length > 0
    opts = options[0]
  if !opts.metadata
    opts.metadata = {}
  opts