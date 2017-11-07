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

const mocha = require('gulp-mocha');
const clangFormat = require('clang-format');
const del = require('del');
const format = require('gulp-clang-format');
const fs = require('fs');
const gulp = require('gulp');
const merge = require('merge2');
const path = require('path');
const sourcemaps = require('gulp-sourcemaps');
const spawn = require('child_process').spawn;
const ts = require('gulp-typescript');
const tslint = require('gulp-tslint');

const outDir = 'build';
const sources = [ 'src/**/*.ts' ];
const tests = [ 'test/**/*.ts' ];
const allFiles = [ '*.js' ].concat(sources, tests);

let exitOnError = true;
function onError() {
  if (exitOnError) {
    process.exit(1);
  }
}

gulp.task('test.check-format', () => {
  return gulp.src(allFiles)
      .pipe(format.checkFormat('file', clangFormat))
      .on('warning', onError);
});

gulp.task('format', () => {
  return gulp.src(allFiles, {base : '.'})
      .pipe(format.format('file', clangFormat))
      .pipe(gulp.dest('.'));
});

gulp.task('test.check-lint', () => {
  return gulp.src(allFiles)
      .pipe(tslint({formatter : 'verbose'}))
      .pipe(tslint.report())
      .on('warning', onError);
});

gulp.task('clean', () => { return del([ `${outDir}` ]); });

gulp.task('compile', () => {
  const tsResult = gulp.src(sources)
                       .pipe(sourcemaps.init())
                       .pipe(ts.createProject('tsconfig.json')())
                       .on('error', onError);
  return merge([
    tsResult.dts.pipe(gulp.dest(`${outDir}/definitions`)),
    tsResult.js
        .pipe(sourcemaps.write(
            '.', {includeContent : false, sourceRoot : '../../src'}))
        .pipe(gulp.dest(`${outDir}/src`)),
    tsResult.js.pipe(gulp.dest(`${outDir}/src`))
  ]);
});

gulp.task('test.compile', [ 'compile' ], () => {
  return gulp.src(tests, {base : '.'})
      .pipe(sourcemaps.init())
      .pipe(ts.createProject('tsconfig.json')())
      .on('error', onError)
      .pipe(
          sourcemaps.write('.', {includeContent : false, sourceRoot : '../..'}))
      .pipe(gulp.dest(`${outDir}/`));
});

function dockerBuild(tag, baseDir, cb) {
  spawn('docker', [ 'build', '-t', tag, baseDir ], {
    stdio : 'inherit'
  }).on('close', cb);
}

gulp.task('test.unit', [ 'test.compile', 'test.check-format', 'test.check-lint' ], () => {
  return gulp.src([ `${outDir}/test/**/*.js` ]).pipe(mocha({
    reporter : 'spec',
    timeout : 25000,
    require : 'source-map-support/register'
  }));
});

gulp.task('watch', () => {
  exitOnError = false;
  gulp.start([ 'test.compile' ]);
  // TODO: also run unit tests in a non-fatal way
  return gulp.watch(allFiles, [ 'test.compile' ]);
});

gulp.task('test', [ 'test.unit' ]);
gulp.task('default', [ 'compile' ]);
