
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

      frontendStandalone: {
        expand: true,
        cwd: 'src/',
        src: ['public/js/views/*.coffee'],
        dest: 'src',
        ext: '.js'
      },

      frontend: {
        expand: true,
        cwd: 'src/',
        src: ['public/**/*.coffee', '!public/js/views/*.coffee'],
        dest: 'tmp/assets',
        ext: '.js'
      }
    },

    sass: {
      dev: {
        expand: true,
        cwd: 'src/',
        src: ['public/css/**/*.scss'],
        dest: 'tmp/assets',
        ext: '.css'
      },
      prod: {
          expand: true,
          cwd: 'src/',
          src: ['public/css/**/*.scss'],
          dest: 'tmp/assets',
          ext: '.css'
      }
    },

    concat: {
      js: {
        options: {
          separator: ';',
        },
        src: ['src/public/js/lib/modernizr.js', 'src/public/js/lib/jquery.js', 'src/public/js/lib/**/*.js'],
        dest: 'src/public/js/lib.js',
      },
      commonJS: {
        options: {
          separator: ';',
        },
        src: ['tmp/assets/public/js/common/**/*.js'],
        dest: 'src/public/js/common.js',
      },
      cssApplication: {
        src: ['!src/public/css/application.css',
              'src/public/css/bootstrap.min.css',
              'src/public/css/font-awesome.min.css',
              'src/public/css/awesome-bootstrap-checkbox.css',
              'tmp/assets/public/css/application.css'],
        dest: 'src/public/css/application.css',
      },
    },

    copy: {
      assets: {
        expand: true,
        cwd: 'src/public/',
        src: ['css/application.css', 'css/comming.css', 'js/application.js', 'js/site.js', 'js/common.js', 'js/lib.js', 'js/views/*.js', 'vendor/*.js', 'tmp/.gitignore', 'img/*.png', 'img/*.jpg', 'fonts/**'],
        dest: 'public/'
      },
      views: {
        expand: true,
        cwd: 'src/views/',
        src: ['**'],
        dest: 'views/'
      }
    },

    uglify : {
      prod: {
        files: {
          'src/public/js/lib.js': ['src/public/js/lib.js'],
          'src/public/js/common.js': ['src/public/js/common.js']
        }
      },
      views: {
        expand: true,
        cwd: 'src/public/js/views',
        src: ['**/*.js'],
        dest: 'src/public/js/views'
      }
    },

    watch: {
      coffee: {
        files: ['src/public/js/**/*.coffee'],
        tasks: ['coffee:frontend', 'coffee:frontendStandalone', 'concat:js', 'concat:commonJS']
      },
      sass: {
        files: ['src/public/css/**/*.scss'],
        tasks: ['sass:dev', 'concat:cssApplication', 'concat:cssComming']
      }
    }

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
    // cssmin: {
    //   options: {
    //     banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> */'
    //   },
    //   app: {
    //     src: '<%= concat.app_css.dest %>',
    //     // dest: SRC_PUBLIC + 'css/app.min.css'
    //   },
    //   login: {
    //     src: '<%= concat.login_css.dest %>',
    //     // dest: SRC_PUBLIC + 'css/login.min.css'
    //   }
    // }
  });
  grunt.event.on('watch', function(action, filepath) {
    return grunt.log.writeln(filepath + ' has ' + action);
  });
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('default', ['coffee:frontend', 'coffee:frontendStandalone', 'sass:dev', 'concat', 'watch']);
  grunt.registerTask('build', ['coffee', 'sass:prod', 'concat', 'uglify', 'copy']);
};
