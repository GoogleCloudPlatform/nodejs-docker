
require('source-map-support').install();

const async = require('async');
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

gulp.task('test.prepare',
          [ 'test.compile', 'test.check-format', 'test.check-lint' ], cb => {
            const baseDir = __dirname;
            const testDir = path.join(baseDir, 'test');
            dockerBuild('test/nodejs', baseDir, () => {
              fs.readdir(testDir, 'utf8', (err, items) => {
                if (err) {
                  return cb(err);
                }

                const buildDirs =
                    items
                        .filter(pathname => {
                          return fs.lstatSync(path.join(testDir, pathname))
                              .isDirectory();
                        })
                        .map(pathname => {
                          return (cb) => {
                            dockerBuild(`test/${pathname}`,
                                        path.join(testDir, pathname), cb);
                          };
                        });

                async.series(buildDirs, (err) => { cb(err); });
              });
            });
          });

gulp.task('test.unit', [ 'test.prepare' ], () => {
  return gulp.src([ `${outDir}/test/**/*.js` ])
      .pipe(mocha({reporter : 'spec', timeout : 25000}));
});

gulp.task('watch', () => {
  exitOnError = false;
  gulp.start([ 'test.compile' ]);
  // TODO: also run unit tests in a non-fatal way
  return gulp.watch(allFiles, [ 'test.compile' ]);
});

gulp.task('test', [ 'test.unit' ]);
gulp.task('default', [ 'compile' ]);
