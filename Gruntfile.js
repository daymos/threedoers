
module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    coffee: {
      backend: {
        expand: true,
        cwd: 'src/',
        src: ['server.coffee', 'config.coffee', 'lib/**/*.coffee'],
        dest: '.',
        ext: '.js'
      },
      frontend: {
        expand: true,
        cwd: 'src/',
        src: ['public/**/*.coffee'],
        dest: 'public/',
        ext: '.js'
      }
    },
    copy: {
      files: {
        expand: true,
        cwd: 'src/public/',
        src: ['**'],
        dest: 'public/'
      }
    },
    // concat: {
    //   app_js: {
    //     src: [SRC_VENDOR + 'js/modernizr.js', SRC_VENDOR + 'js/moment.js', SRC_VENDOR + 'js/socket_io.js', SRC_VENDOR + 'js/lodash.js', SRC_VENDOR + 'js/jquery.js', SRC_VENDOR + 'js/jquery_easing.js', SRC_VENDOR + 'js/jquery_ui.js', SRC_VENDOR + 'js/jquery_layout.js', SRC_VENDOR + 'js/jquery_blockui.js', SRC_VENDOR + 'js/jquery_validate.js', SRC_VENDOR + 'js/jquery_jcrop.js', SRC_VENDOR + 'js/jquery_form.js', SRC_VENDOR + 'js/jquery_chosen.js', SRC_VENDOR + 'js/jquery_ajax_chosen.js', SRC_VENDOR + 'js/jquery_icheck.js', SRC_VENDOR + 'js/jquery_maskedinput.js', SRC_VENDOR + 'js/jquery_nicescroll.js', SRC_VENDOR + 'js/jquery_pnotify.js', SRC_VENDOR + 'js/backbone.js', SRC_VENDOR + 'js/bootstrap.js', SRC_VENDOR + 'js/bootstrap_datepicker.js', SRC_VENDOR + 'js/bootstrap_timepicker.js', SRC_VENDOR + 'js/holder.js', SRC_COMPILED + 'js/jst.js', '<%= coffee.app.dest %>'],
    //     dest: SRC_PUBLIC + 'js/app.js'
    //   },
    //   login_js: {
    //     src: [SRC_VENDOR + 'js/modernizr.js', SRC_VENDOR + 'js/jquery.js', SRC_VENDOR + 'js/lodash.js', SRC_VENDOR + 'js/bootstrap.js', SRC_VENDOR + 'js/jquery_easing.js', SRC_VENDOR + 'js/jquery_ui.js', SRC_VENDOR + 'js/jquery_layout.js', SRC_VENDOR + 'js/jquery_validate.js', '<%= coffee.login.dest %>'],
    //     dest: SRC_PUBLIC + 'js/login.js'
    //   },
    //   app_css: {
    //     src: [SRC_VENDOR + 'css/normalize.css', SRC_VENDOR + 'css/jquery_layout.css', SRC_VENDOR + 'css/bootstrap.css', SRC_VENDOR + 'css/bootstrap_datepicker.css', SRC_VENDOR + 'css/bootstrap_timepicker.css', SRC_VENDOR + 'css/pnotify.css', SRC_VENDOR + 'css/jquery_datepicker.css', SRC_VENDOR + 'css/jquery_chosen.css', SRC_VENDOR + 'css/jquery_icheck.css', SRC_VENDOR + 'css/jquery_jcrop.css', '<%= less.app.dest %>'],
    //     dest: SRC_PUBLIC + 'css/app.css'
    //   },
    //   login_css: {
    //     src: [SRC_VENDOR + 'css/normalize.css', SRC_VENDOR + 'css/jquery_layout.css', SRC_VENDOR + 'css/bootstrap.css', SRC_VENDOR + 'css/jquery_icheck.css', '<%= less.login.dest %>'],
    //     dest: SRC_PUBLIC + 'css/login.css'
    //   }
    // },
    // uglify: {
    //   options: {
    //     banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> */'
    //   },
    //   app: {
    //     src: '<%= concat.app_js.dest %>',
    //     dest: SRC_PUBLIC + 'js/app.min.js'
    //   },
    //   login: {
    //     src: '<%= concat.login_js.dest %>',
    //     dest: SRC_PUBLIC + 'js/login.min.js'
    //   }
    // },
    cssmin: {
      options: {
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> */'
      },
      app: {
        src: '<%= concat.app_css.dest %>',
        // dest: SRC_PUBLIC + 'css/app.min.css'
      },
      login: {
        src: '<%= concat.login_css.dest %>',
        // dest: SRC_PUBLIC + 'css/login.min.css'
      }
    }
  });
  grunt.event.on('watch', function(action, filepath) {
    return grunt.log.writeln(filepath + ' has ' + action);
  });
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-copy');
  // grunt.registerTask('default', ['coffee', 'jst', 'less', 'concat']);
  grunt.registerTask('build', ['coffee:backend', 'copy']);
};
