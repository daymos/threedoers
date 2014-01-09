###################################
# STLStats migration from PHP code
######################################
q = require 'q'
pack = require('bufferpack')

logger = require './logger'

class STLStats

  constructor: (@gridStore) ->
    @flag = false  # boolean flag to minimize repeated volume computation overhead
    @density = 1.04
    @points = []
    @triangles = []

  # 1. Public Functions

  getVolume: (unit) ->
    ###
    # Returns the calculated Volume (cc) of the 3D object represented in the binary STL.
    # If $unit is "cm" then returns volume in cubic cm, but If $unit is "inch" then returns volume in cubic inches.
    ###
    deferred = q.defer()
    _volume = =>
      if unit == 'cm'
        deferred.resolve @volume / 1000
      else
        deferred.resolve @inch3(@volume / 1000)

    unless @flag
      logger.debug "Not cached, starting volume calculation"
      @calculateVolume().then (v) =>
        @volume = v
        @flag = true
        _volume()
    else
      _volume()

  getWeight: ->
    ###
    # Returns the calculated Weight (gm) of the 3D object represented in the binary STL.
    ###
    @calculateWeight @getVolume('cm')

  getDensity: ->
    ###
    # Returns the set Density (gm/cc) of the material.
    ###
    @density

  setDensity: (den) ->
    ###
    # Sets the Density (gm/cc) of the material.
    ###
    @density = den

  getTrianglesCount: ->
    ###
    # Returns the number of trianges specified in the binary STL definition of the 3D object.
    ###
    @triangles_count

  # 2. Infrastructure Functions

  calculateVolume: ->
    ###
    # Invokes the binary file reader to read the header,
    # serially reads all the normal vector and triangular co-ordinates,
    # calls the math function to calculate signed tetrahedral volumes for each trangle,
    # sums up these volumes to give the final volume of the 3D object represented in the .stl binary file.
    ###
    logger.debug "Calculating volume"
    deferred = q.defer()

    that = @

    partialCalculate =  ->
      that.gridStore.tell (err, position) =>
        logger.debug "Position #{position} of #{totbytes}"
        if err
          deferred.reject e
        else
          if position < totbytes
            that.read_triangle().then (vol) =>
              console.log totalVolume
              totalVolume += vol
              console.log totalVolume
              partialCalculate()  # next part
          else
            console.log "should end", totalVolume
            process = false
            deferred.resolve totalVolume

    totalVolume = 0
    # BINARY STL Volume Calc
    totbytes = @gridStore.length
    logger.debug "#{totbytes} to be processed."
    totalVolume = 0
    @read_header()
    .then( =>
      logger.debug "Headers was read"
      @read_triangles_count()
    ).then( (count) =>
      @triangles_count = count
      logger.debug "Starting heavy process"
      partialCalculate()
    ).fail( (reason) ->
      deferred.reject reason
    ).finally( ->
      @gridStore.close()
    )

    deferred.promise

  my_unpack: (sig, l)->
    ###
    # Wrapper around PHP's unpack() function which decodes binary numerical data to float, int, etc types.
    # sig specifies the type of data (i.e. integer, float, etc)
    # l specifies number of bytes to read.
    ###
    deferred = q.defer()

    @gridStore.read l, (err, data) ->
      if err
        deferred.reject err
      else
        deferred.resolve pack.unpack(sig, data)

    deferred.promise

  my_append: (mystuff) ->
    ###
    # Appends to an array either a single var or the contents of another array.
    ###
    if mystuff instanceof Array
      @triangles = @triangles.concat(mystuff)
    else
      @triangles.push mystuff

  # 3. Binary read functions

  read_header: ->
    ###
    # Reads the binary header field in the STL file and offsets the file reader pointer to
    # enable reading the triangle-normal data
    ###
    deferred = q.defer()

    @gridStore.tell (err, position) =>
      if err
        deferred.reject err
      else
        @gridStore.seek position+80, (err, gridStore) ->
          if err
            deferred.reject err
          else
            deferred.resolve null  # we don't need any data

    deferred.promise

  read_triangles_count: ->
    ###
    # Reads the binary field in the STL file which specifies the total number of triangles
    # and returns that integer.
    ###
    @my_unpack("I", 4).then (length) ->
      length[1]

  read_triangle: ->
    ###
    # Reads a triangle data from the binary STL and returns its signed volume.
    # A binary STL is a representation of a 3D object as a collection of triangles and their normal vectors.
    # Its specifiction can be found here:
    # http://en.wikipedia.org/wiki/STL_(file_format)%23Binary_STL
    # This function reads the bytes of the binary STL file, decodes the data to give float XYZ co-ordinates of the trinaglular
    # vertices and the normal vector for a triangle.
    ###
    @my_unpack("3f", 12).then (n) =>
      @my_unpack("3f", 12).then (p1) =>
        @my_unpack("3f", 12).then (p2) =>
          @my_unpack("3f", 12).then (p3) =>
            @my_unpack("v", 2).then (b) =>
              l = @points.length
              @my_append([l, l+1, l+2])
              @signedVolumeOfTriangle(p1, p2, p3)

  # 5. Math Functions

  signedVolumeOfTriangle: (p1, p2, p3) ->
    ###
    # Returns the signed volume of a triangle as determined by its 3D, XYZ co-ordinates.
    # The var $pn contains an array(x,y,z).
    ###
    console.log p1
    console.log p2
    console.log p3
    v321 = p3[0] * p2[1] * p1[2]
    v231 = p2[0] * p3[1] * p1[2]
    v312 = p3[0] * p1[1] * p2[2]
    v132 = p1[0] * p3[1] * p2[2]
    v213 = p2[0] * p1[1] * p3[2]
    v123 = p1[0] * p2[1] * p3[2]

    (1.0/6.0)*(-v321 + v231 + v312 - v132 - v213 + v123)

  inch3: (v) ->
    ###
    # Converts the volume specified in cubic cm to cubic inches.
    ###
    v * 0.0610237441

  calculateWeight: (volumeIn_cm) ->
    ###
    # Calculates the weight of the supplied volume specified in cubic cm and returns it in gms.
    ###
    volumeIn_cm * @density

module.exports.STLStats = STLStats