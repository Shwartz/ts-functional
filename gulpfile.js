const gulp = require('gulp');

const del = require('del');
const rollup = require('rollup-stream');
const includePaths = require('rollup-plugin-includepaths');
const resolve = require('rollup-plugin-node-resolve');
const source = require('vinyl-source-stream');
const mocha = require('gulp-mocha');
const bump = require('gulp-bump');
const tagVersion = require('gulp-tag-version');
const git = require('gulp-git');
const exec = require('child_process').exec;
const filter = require('gulp-filter');


const rollupStream = require('./build/gulp/plugins/rollupStream');


gulp.task('clean', () => {
    return del([
        './dist',
        './target'
    ]);
});

gulp.task('client', gulp.series('clean', () => rollup({
    input:   './src/index.ts',
    format:  'umd',
    name:    'functional',
    plugins: [
        resolve({
            browser: true
        }),
        includePaths({
            // include,
            extensions: ['.ts']
        })]
}).pipe(source('index.js'))
    .pipe(gulp.dest(`./dist`))));

gulp.task('runTest', () => {
    process.env.NODE_ENV = 'test';
    return gulp.src([
        './target/**/*.js'
    ], {read: false})
        .pipe(mocha({reporter: 'spec', exit: true}))

});
gulp.task('rollupTest', () => {
    return gulp.src('./test/**/*.ts', {read: false})
        .pipe(rollupStream('/test/', false, 'cjs'))
        .pipe(gulp.dest('./target'));
});

gulp.task('test', gulp.series('clean', 'rollupTest', 'runTest'));

gulp.task('bump', () => gulp.src(['./package.json'])
    .pipe(bump({
        type: 'patch',
    }))
    .pipe(gulp.dest('./'))
    // commit the changed version number
    .pipe(git.commit('bumps package version'))
    .pipe(filter('package.json'))
    .pipe(tagVersion()));


gulp.task('pushTags', (cb) => {
    exec('git push --tags', (err, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

gulp.task('updateVersion', gulp.series('test', 'client', 'bump', 'pushTags'));

gulp.task('publish', gulp.series('updateVersion',(cb) => {
    exec('npm publish ./', (err, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
}));

gulp.task('default', gulp.series('test', 'client'));

