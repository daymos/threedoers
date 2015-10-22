var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var plumber = require('gulp-plumber');
var livereload = require('gulp-livereload');
var sass = require('gulp-sass');
var compass = require('gulp-compass');
var minifyCSS = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var streamify = require('gulp-streamify');
var browserify = require('browserify');
var notify = require('gulp-notify');


// This gulp task will be only used production
gulp.task('scripts', function() {
  // build frontend files
  browserify({
    entries: 'frontend/javascript/index.jsx',
    extensions: ['.jsx'],
    debug: true
  })
  .transform(babelify)
  .bundle()
  .pipe(source('app.js'))
  // .pipe(streamify(uglify()))
  .pipe(gulp.dest('public/javascript'));
});


gulp.task('sass', function () {
  gulp.src('./frontend/scss/*.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(minifyCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest('./public/styles'))
    .pipe(livereload());
});


gulp.task('watch', function() {
  gulp.watch('./frontend/scss/*.scss', ['sass']);
  gulp.watch(['./frontend/javascript/**/*.jsx', './app/components/**/*.jsx'], ['scripts']);
});


gulp.task('develop', function () {
  livereload.listen();
  nodemon({
    watch: ['app', 'app.js', 'config', 'libs'],
    script: 'app.js',
    ext: 'js jsx coffee html',
    env: { 'NODE_PATH': 'app:libs' }
  }).on('restart', function () {
    setTimeout(function () {
      notify('Reloading page, please wait...');
      livereload.changed(__dirname);
    }, 5000);
  });
});


gulp.task('default', [
  'sass',
  'scripts',
  'develop',
  'watch'
]);

