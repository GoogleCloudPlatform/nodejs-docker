/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require('source-map-support').install();

var del = require('del');
var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');

gulp.task('clean', function() {
  return del('dist/**/*');
});

gulp.task('copy-package-json', ['clean'], function() {
  return gulp.src('package.json')
             .pipe(gulp.dest('dist'));
});

gulp.task('copy-data', ['copy-package-json'], function() {
  return gulp.src('src/data/**/*')
             .pipe(gulp.dest('dist/src/data'));
});

gulp.task('compile-test', ['copy-data'], function() {
  return gulp.src(["test/**/*.ts"])
             .pipe(sourcemaps.init())
             .pipe(ts.createProject('tsconfig.json')())
             .pipe(sourcemaps.write())
             .pipe(gulp.dest('dist/test'));
});

gulp.task('compile-src', ['compile-test'], function() {
  return gulp.src(["src/**/*.ts"])
             .pipe(sourcemaps.init())
             .pipe(ts.createProject('tsconfig.json')())
             .pipe(sourcemaps.write())
             .pipe(gulp.dest('dist/src'));
});

gulp.task('compile', [ 'compile-src' ]);

gulp.task('default', ['compile']);
