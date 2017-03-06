var del = require('del');
var gulp = require('gulp');
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');
var tsProject = ts.createProject('tsconfig.json');

gulp.task('clean', function() {
  return del('dist/**/*');
});

gulp.task('copy-data', ['clean'], function() {
  return gulp.src('src/data/**/*')
             .pipe(gulp.dest('dist/src/data'));
});

gulp.task('default', ['copy-data'], function() {
    return tsProject.src()
                    .pipe(sourcemaps.init())
                    .pipe(tsProject())
                    .pipe(sourcemaps.write())
                    .pipe(gulp.dest('dist'));
});
