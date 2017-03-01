var gulp = require("gulp");
var ts = require("gulp-typescript");
var sourcemaps = require('gulp-sourcemaps');
var tsProject = ts.createProject("tsconfig.json");

gulp.task("default", function () {
    return tsProject.src()
                    .pipe(sourcemaps.init())
                    .pipe(tsProject())
                    .pipe(sourcemaps.write())
                    .pipe(gulp.dest("dist"));
});
