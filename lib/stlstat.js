(function() {
  var STLStats, logger, pack, q;

  q = require('q');

  pack = require('bufferpack');

  logger = require('./logger');

  STLStats = (function() {
    function STLStats(gridStore) {
      this.gridStore = gridStore;
      this.flag = false;
      this.density = 1.04;
      this.points = [];
      this.triangles = [];
    }

    STLStats.prototype.getVolume = function(unit) {
      /*
      # Returns the calculated Volume (cc) of the 3D object represented in the binary STL.
      # If $unit is "cm" then returns volume in cubic cm, but If $unit is "inch" then returns volume in cubic inches.
      */

      var deferred, _volume,
        _this = this;
      deferred = q.defer();
      _volume = function() {
        if (unit === 'cm') {
          return deferred.resolve(_this.volume / 1000);
        } else {
          return deferred.resolve(_this.inch3(_this.volume / 1000));
        }
      };
      if (!this.flag) {
        logger.debug("Not cached, starting volume calculation");
        return this.calculateVolume().then(function(v) {
          _this.volume = v;
          _this.flag = true;
          return _volume();
        });
      } else {
        return _volume();
      }
    };

    STLStats.prototype.getWeight = function() {
      /*
      # Returns the calculated Weight (gm) of the 3D object represented in the binary STL.
      */

      return this.calculateWeight(this.getVolume('cm'));
    };

    STLStats.prototype.getDensity = function() {
      /*
      # Returns the set Density (gm/cc) of the material.
      */

      return this.density;
    };

    STLStats.prototype.setDensity = function(den) {
      /*
      # Sets the Density (gm/cc) of the material.
      */

      return this.density = den;
    };

    STLStats.prototype.getTrianglesCount = function() {
      /*
      # Returns the number of trianges specified in the binary STL definition of the 3D object.
      */

      return this.triangles_count;
    };

    STLStats.prototype.calculateVolume = function() {
      /*
      # Invokes the binary file reader to read the header,
      # serially reads all the normal vector and triangular co-ordinates,
      # calls the math function to calculate signed tetrahedral volumes for each trangle,
      # sums up these volumes to give the final volume of the 3D object represented in the .stl binary file.
      */

      var deferred, partialCalculate, that, totalVolume, totbytes,
        _this = this;
      logger.debug("Calculating volume");
      deferred = q.defer();
      that = this;
      partialCalculate = function() {
        var _this = this;
        return that.gridStore.tell(function(err, position) {
          var process;
          logger.debug("Position " + position + " of " + totbytes);
          if (err) {
            return deferred.reject(e);
          } else {
            if (position < totbytes) {
              return that.read_triangle().then(function(vol) {
                console.log(totalVolume);
                totalVolume += vol;
                console.log(totalVolume);
                return partialCalculate();
              });
            } else {
              console.log("should end", totalVolume);
              process = false;
              return deferred.resolve(totalVolume);
            }
          }
        });
      };
      totalVolume = 0;
      totbytes = this.gridStore.length;
      logger.debug("" + totbytes + " to be processed.");
      totalVolume = 0;
      this.read_header().then(function() {
        logger.debug("Headers was read");
        return _this.read_triangles_count();
      }).then(function(count) {
        _this.triangles_count = count;
        logger.debug("Starting heavy process");
        return partialCalculate();
      }).fail(function(reason) {
        return deferred.reject(reason);
      })["finally"](function() {
        return this.gridStore.close();
      });
      return deferred.promise;
    };

    STLStats.prototype.my_unpack = function(sig, l) {
      /*
      # Wrapper around PHP's unpack() function which decodes binary numerical data to float, int, etc types.
      # sig specifies the type of data (i.e. integer, float, etc)
      # l specifies number of bytes to read.
      */

      var deferred;
      deferred = q.defer();
      this.gridStore.read(l, function(err, data) {
        if (err) {
          return deferred.reject(err);
        } else {
          return deferred.resolve(pack.unpack(sig, data));
        }
      });
      return deferred.promise;
    };

    STLStats.prototype.my_append = function(mystuff) {
      /*
      # Appends to an array either a single var or the contents of another array.
      */

      if (mystuff instanceof Array) {
        return this.triangles = this.triangles.concat(mystuff);
      } else {
        return this.triangles.push(mystuff);
      }
    };

    STLStats.prototype.read_header = function() {
      /*
      # Reads the binary header field in the STL file and offsets the file reader pointer to
      # enable reading the triangle-normal data
      */

      var deferred,
        _this = this;
      deferred = q.defer();
      this.gridStore.tell(function(err, position) {
        if (err) {
          return deferred.reject(err);
        } else {
          return _this.gridStore.seek(position + 80, function(err, gridStore) {
            if (err) {
              return deferred.reject(err);
            } else {
              return deferred.resolve(null);
            }
          });
        }
      });
      return deferred.promise;
    };

    STLStats.prototype.read_triangles_count = function() {
      /*
      # Reads the binary field in the STL file which specifies the total number of triangles
      # and returns that integer.
      */

      return this.my_unpack("I", 4).then(function(length) {
        return length[1];
      });
    };

    STLStats.prototype.read_triangle = function() {
      /*
      # Reads a triangle data from the binary STL and returns its signed volume.
      # A binary STL is a representation of a 3D object as a collection of triangles and their normal vectors.
      # Its specifiction can be found here:
      # http://en.wikipedia.org/wiki/STL_(file_format)%23Binary_STL
      # This function reads the bytes of the binary STL file, decodes the data to give float XYZ co-ordinates of the trinaglular
      # vertices and the normal vector for a triangle.
      */

      var _this = this;
      return this.my_unpack("3f", 12).then(function(n) {
        return _this.my_unpack("3f", 12).then(function(p1) {
          return _this.my_unpack("3f", 12).then(function(p2) {
            return _this.my_unpack("3f", 12).then(function(p3) {
              return _this.my_unpack("v", 2).then(function(b) {
                var l;
                l = _this.points.length;
                _this.my_append([l, l + 1, l + 2]);
                return _this.signedVolumeOfTriangle(p1, p2, p3);
              });
            });
          });
        });
      });
    };

    STLStats.prototype.signedVolumeOfTriangle = function(p1, p2, p3) {
      /*
      # Returns the signed volume of a triangle as determined by its 3D, XYZ co-ordinates.
      # The var $pn contains an array(x,y,z).
      */

      var v123, v132, v213, v231, v312, v321;
      console.log(p1);
      console.log(p2);
      console.log(p3);
      v321 = p3[0] * p2[1] * p1[2];
      v231 = p2[0] * p3[1] * p1[2];
      v312 = p3[0] * p1[1] * p2[2];
      v132 = p1[0] * p3[1] * p2[2];
      v213 = p2[0] * p1[1] * p3[2];
      v123 = p1[0] * p2[1] * p3[2];
      return (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
    };

    STLStats.prototype.inch3 = function(v) {
      /*
      # Converts the volume specified in cubic cm to cubic inches.
      */

      return v * 0.0610237441;
    };

    STLStats.prototype.calculateWeight = function(volumeIn_cm) {
      /*
      # Calculates the weight of the supplied volume specified in cubic cm and returns it in gms.
      */

      return volumeIn_cm * this.density;
    };

    return STLStats;

  })();

  module.exports.STLStats = STLStats;

}).call(this);
