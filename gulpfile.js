var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var plumber = require('gulp-plumber');
var livereload = require('gulp-livereload');
var sass = require('gulp-sass');
var compass = require('gulp-compass');
var minifyCSS = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var htmlreplace = require('gulp-html-replace');

// This gulp task will be only used production
gulp.task('scripts', function() {
  gulp.src('./frontend/javascript/*.js')
    .pipe(concat('app.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./public/javascript/'));
});

gulp.task('sass', function () {
  gulp.src('./frontend/scss/*.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(gulp.dest('./frontend/temp/css'))
    .pipe(livereload());
});

gulp.task('watch', function() {
  gulp.watch('./frontend/scss/*.scss', ['sass']);
});

gulp.task('develop', function () {
  livereload.listen();
  nodemon({
    watch: ['app', 'app.js', 'config', 'lib'],
    script: 'app.js',
    ext: 'js coffee swig',
  }).on('restart', function () {
    setTimeout(function () {
      livereload.changed(__dirname);
    }, 500);
  });
});

gulp.task('performance', function(){
  gulp.src('app/views/layout.swig')
    .pipe(htmlreplace({
      'css': 'css/app.css',
      'js': 'javascript/app.js',
      'js-header': 'javascript/header.js',
      'js-vendor': 'javascript/vendor.js'
    }))
    .pipe(gulp.dest('app/views/layout-prod.swig'));
});

gulp.task('default', [
  'sass',
  'develop',
  'watch'
]);

gulp.task('production', [
  'sass',
  'script',
  'performance'
]);
