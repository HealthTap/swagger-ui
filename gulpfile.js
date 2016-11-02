'use strict';

var gulp = require('gulp');
var path = require('path')
var es = require('event-stream');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var less = require('gulp-less');
var handlebars = require('gulp-handlebars');
var wrap = require('gulp-wrap');
var template = require('gulp-template');
var declare = require('gulp-declare');
var watch = require('gulp-watch');
var connect = require('gulp-connect');
var header = require('gulp-header');
var pkg = require('./package.json');
var order = require('gulp-order');
var banner = ['/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''].join('\n');

/**
 * Clean ups ./dist folder
 */
gulp.task('clean', function() {
  return gulp
    .src('./dist', {read: false})
    .pipe(clean({force: true}))
    .on('error', log);
});

/**
 * Processes Handlebars templates
 */
function templates() {
  return gulp
    .src(['./src/main/template/**/*'])
    .pipe(handlebars())
    .pipe(wrap('Handlebars.template(<%= contents %>)'))
    .pipe(declare({
      namespace: 'Handlebars.templates',
      noRedeclare: true, // Avoid duplicate declarations
    }))
    .on('error', log);
}

/**
 * Build a distribution
 */
gulp.task('dist', ['clean'], function() {
  var browser_swagger_client_path = path.resolve(
    path.dirname(require.resolve('swagger-client')),
    'browser/swagger-client.js'
  );

  return es.merge(
      gulp.src([
        './src/main/javascript/**/*.js',
        browser_swagger_client_path,
      ]),
      templates()
    )
    .pipe(order(['scripts.js', 'templates.js']))
    .pipe(concat('swagger-ui.js'))
    .pipe(wrap('(function(){<%= contents %>}).call(this);'))
    .pipe(header(banner, { pkg: pkg } ))
    .pipe(gulp.dest('./dist'))
    .pipe(uglify())
    .on('error', log)
    .pipe(rename({extname: '.min.js'}))
    .on('error', log)
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());
});

/**
 * Processes less files into CSS files
 */
gulp.task('less', ['clean'], function() {

  return gulp
    .src(['./src/main/less/**/*.less'])
    .pipe(less())
    .on('error', log)
    .pipe(gulp.dest('./src/main/html/css/'))
    .pipe(connect.reload());
});


/**
 * Copy lib and html folders
 */
gulp.task('copy', ['dist', 'less'], function() {
  var prefix = process.env.SWAGGER_DOCS_PREFIX || '/';

  // copy JavaScript files inside lib folder
  gulp
    .src(['./lib/**/*.{js,map}'])
    .pipe(gulp.dest('./dist/lib'))
    .on('error', log);

  // copy all files inside html folder except html
  gulp
    .src(['./src/main/html/**/*', '!./src/main/html/**/*.html'])
    .pipe(gulp.dest('./dist'))
    .on('error', log);

  // copy index.html with template
  gulp
    .src(['./src/main/html/**/*.html'])
    .pipe(template({prefix: prefix}))
    .pipe(gulp.dest('./dist'))
    .on('error', log);

});

/**
 * Watch for changes and recompile
 */
gulp.task('watch', function() {
  return watch(['./src/**/*.{html,js,less,handlebars}'], function() {
    gulp.start('default');
  });
});

/**
 * Live reload web server of `dist`
 */
gulp.task('connect', function() {
  connect.server({
    root: 'dist',
    livereload: true
  });
});

function log(error) {
  console.error(error.toString && error.toString());
}


gulp.task('default', ['copy']);
gulp.task('serve', ['connect', 'watch']);
