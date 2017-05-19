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

var mocha = require('gulp-mocha');
var clangFormat = require('clang-format');
var del = require('del');
var format = require('gulp-clang-format');
var gulp = require('gulp');
var merge = require('merge2');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var tslint = require('gulp-tslint');

var outDir = 'dist';
var sources = ['src/**/*.ts'];
var tests = ['test/**/*.ts'];
var allFiles = ['*.js'].concat(sources, tests);

var exitOnError = true;
function onError() {
  if (exitOnError) {
    process.exit(1);
  }
}

gulp.task('test.check-format', function() {
  return gulp.src(allFiles)
      .pipe(format.checkFormat('file', clangFormat))
      .on('warning', onError);
});

gulp.task('format', function() {
  return gulp.src(allFiles, {base: '.'})
      .pipe(format.format('file', clangFormat))
      .pipe(gulp.dest('.'));
});

gulp.task('test.check-lint', function() {
  return gulp.src(allFiles)
      .pipe(tslint({formatter: 'verbose'}))
      .pipe(tslint.report())
      .on('warning', onError);
});

gulp.task('clean', function() {
  return del([outDir]);
});

gulp.task('copy-package-json', function() {
  return gulp.src('package.json').pipe(gulp.dest(outDir));
});

gulp.task('copy-data', function() {
  return gulp.src('data/**/*').pipe(gulp.dest(outDir + '/data'));
});

gulp.task('compile', ['copy-data', 'copy-package-json'], function() {
  var tsResult = gulp.src(sources)
                     .pipe(sourcemaps.init())
                     .pipe(ts.createProject('tsconfig.json')())
                     .on('error', onError);
  return merge([
    tsResult.dts.pipe(gulp.dest(outDir + '/definitions')),
    tsResult.js
        .pipe(sourcemaps.write(
            '.', {includeContent: false, sourceRoot: '../../src'}))
        .pipe(gulp.dest(outDir + '/src')),
    tsResult.js.pipe(gulp.dest(outDir + '/src'))
  ]);
});

gulp.task('test.compile', ['compile'], function() {
  return gulp.src(tests, {base: '.'})
      .pipe(sourcemaps.init())
      .pipe(ts.createProject('tsconfig.json')())
      .on('error', onError)
      .pipe(sourcemaps.write('.', {includeContent: false, sourceRoot: '../..'}))
      .pipe(gulp.dest(outDir + '/'));
});

gulp.task('test.unit', ['test.compile'], function() {
  return gulp.src([outDir + '/test/**/*.js']).pipe(mocha({reporter: 'spec'}));
});

gulp.task('watch', function() {
  exitOnError = false;
  gulp.start(['test.compile']);
  // TODO: also run unit tests in a non-fatal way
  return gulp.watch(allFiles, ['test.compile']);
});

gulp.task('test', ['test.unit', 'test.check-format', 'test.check-lint']);
gulp.task('default', ['compile']);
