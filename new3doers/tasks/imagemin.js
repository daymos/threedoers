/**
 * grunt-contrib-imagemin options
 * @type {Object}
 */

module.exports = {
  dist: {
    files: [{
      expand: true,
      cwd: '<%= folders.app %>/images',
      src: '{,*/}*.{png,jpg,jpeg}',
      dest: '<%= folders.dist %>/images'
    }]
  }
};
