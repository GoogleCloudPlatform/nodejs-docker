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

const gulp = require('gulp');
const mocha = require('gulp-mocha');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');

const outDir = 'build';
const tests = [ 'test/**/*.ts' ];

let exitOnError = true;
function onError() {
  if (exitOnError) {
    process.exit(1);
  }
}

gulp.task('test.compile', () => {
  return gulp.src(tests, {base : '.'})
      .pipe(sourcemaps.init())
      .pipe(ts.createProject('tsconfig.json')())
      .on('error', onError)
      .pipe(
          sourcemaps.write('.', {includeContent : false, sourceRoot : '../..'}))
      .pipe(gulp.dest(`${outDir}/`));
});

gulp.task('test', [ 'test.compile' ], () => {
  return gulp.src([ `${outDir}/test/**/*.js` ]).pipe(mocha({
    reporter : 'spec',
    timeout : 25000,
    require : 'source-map-support/register'
  }));
});

gulp.task('default', [ 'test' ]);
