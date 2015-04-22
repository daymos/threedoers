/**
 * grunt-contirb-jade options
 * @type {Object}
 */

module.exports = {
  html: {
    files: [{
      expand: true,
      cwd: '<%= folders.app %>/jade',
      src: ['index.jade',
						'login.jade',
						'signup.jade',
						'home.jade',
						'review-order.jade',
						'accepted-order.jade',
						'printing-order.jade',
						'shipping-order.jade',
						'complete-order.jade',
						'create-order.jade'],
      dest: '.tmp/',
      ext: '.html'
    }],
    options: {
      client: false,
      pretty: true,
      basedir: '<%= folders.app %>/jade'
    }
  }
};
