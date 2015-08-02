import gulp from 'gulp'
import gulpLoadPlugins from 'gulp-load-plugins'
import runSequence from 'run-sequence'
import browserSync from 'browser-sync'
import path from 'path'
import config from './config'

const $ = gulpLoadPlugins()
const bs = browserSync.create()

const src = path.join.bind(undefined, __dirname, config.dirs.src)
const dist = path.join.bind(undefined, __dirname, config.dirs.dist)
const build = path.join.bind(undefined, __dirname, config.dirs.build)
const bower = path.join.bind(undefined, __dirname, config.dirs.bower)

function plumber() {
	return $.plumber({
	})
}

gulp.task('html:jade', function () {
	return gulp.src(src('**', '*.jade'))
		.pipe(plumber())
		.pipe($.jade({locals: {config}}))
		.pipe(gulp.dest(dist()))
})

gulp.task('html', ['html:jade'])

gulp.task('css:less', function () {
	return gulp.src(src(config.css.dir, config.css.src))
		.pipe(plumber())
		.pipe($.less({paths: [bower('bootstrap', 'less')]}))
		.pipe($.rename(config.css.build))
		.pipe(gulp.dest(build()))
})

gulp.task('css:min', function () {
	return gulp.src(build(config.css.build))
		.pipe($.sourcemaps.init())
			.pipe($.csso())
			.pipe($.rename(config.css.dist))
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest(build()))
})

gulp.task('css:img:min', function () {
	return gulp.src(src(config.img.dir, '*.@(ico|svg|jpg|png)'), {base: src()})
		.pipe($.imagemin())
		.pipe(gulp.dest(build()))
})

// finds images in "index.min.css" and embeds them with base64
gulp.task('css:img:base64', function () {
	return gulp.src(build(config.css.dist))
		.pipe($.base64({
			baseDir: build(config.img.dir),
			maxImageSize: 500000,
			extensions: ['ico', 'svg', 'jpg', 'png']
		}))
		.pipe(gulp.dest(dist()))
})

gulp.task('css:parker', function () {
	return gulp.src(dist(config.css.dist))
		.pipe($.parker())
})

gulp.task('css', function (cb) {
	runSequence(
		'css:less',
		'css:min',
		'css:img:min',
		'css:img:base64',
		'css:parker',
		cb
	)
})

gulp.task('js:style', function () {
	return gulp.src(src(config.js.dir, '**', '*.js'), {base: src()})
		.pipe(plumber())
		.pipe($.jscs())
		.pipe($.jshint())
		.pipe($.jshint.reporter('jshint-stylish'))
})

gulp.task('js:test', function () {
	return gulp.src(src(config.js.dir, '**', '*_test.js'))
		.pipe(plumber())
		.pipe($.mocha({ui: 'exports'}))
})

gulp.task('js:bench', function () {
	return gulp.src(src(config.js.dir, '**', '*_bench.js'))
		.pipe(plumber())
		.pipe($.bench())
})

gulp.task('js:browserify', function () {
	return gulp.src(src(config.js.dir, config.js.src))
		.pipe(plumber())
		.pipe($.browserify({
			transform: ['babelify']
		}))
		.pipe($.rename(config.js.build))
		.pipe(gulp.dest(build()))
})

gulp.task('js:minify', function () {
	return gulp.src(build(config.js.build))
		.pipe($.sourcemaps.init())
			.pipe($.uglify())
			.pipe($.rename(config.js.dist))
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest(dist()))
})

gulp.task('js:concat', function () {
	return gulp.src([
		bower('jquery', 'dist', 'jquery.min.js'),
		bower('bootstrap', 'dist', 'js', 'bootstrap.min.js'),
		build(config.js.dist)
	])
		.pipe($.concat(config.js.dist))
		.pipe(gulp.dest(dist()))
})

gulp.task('js', function (cb) {
	runSequence(
		['js:style', 'js:test', 'js:bench'],
		'js:browserify',
		'js:minify',
		'js:concat',
		cb
	)
})

gulp.task('assets:gz', ['html', 'css', 'js'], function () {
	return gulp.src([
		dist('*.@(html|css|js)'),
	])
		.pipe(plumber())
		.pipe($.gzip())
		.pipe(gulp.dest(dist()))
})

gulp.task('assets:copy', function () {
	return gulp.src(src('*.txt'), {dot: true})
		.pipe(gulp.dest(dist()))
})

gulp.task('assets:manifest', function () {
	return gulp.src([
		dist('*'),
		`!${dist(config.manifest)}`
	])
		.pipe(plumber())
		.pipe($.manifest({
			filename: config.manifest,
			hash: true
		}))
		.pipe(gulp.dest(dist()))
})


gulp.task('assets:size', function () {
	return gulp.src([
		dist('*.@(js|css|html).gz'),
		dist(config.manifest)
	])
		.pipe(plumber())
		.pipe($.size())
})

gulp.task('assets', function (cb) {
	runSequence(
		'assets:copy',
		'assets:gz',
		'assets:manifest',
		'assets:size',
		cb
	)
})

gulp.task('build', function (cb) {
	runSequence(
		['html', 'css', 'js'],
		'assets',
		cb
	)
})

gulp.task('watch', ['build'], function () {
	bs.init({
		server: dist(),
		logLevel: 'debug'
	})

	gulp.watch(
		src(config.css.dir, '*.*'),
		() => runSequence('css', 'assets')
	)

	gulp.watch(
		src(config.js.dir, '*.*'),
		() => runSequence('js', 'assets')
	)

	gulp.watch(
		src('**', '*.jade'),
		() => runSequence('html', 'assets')
	)

	gulp.watch(
		src('**', '*.txt'),
		['assets']
	)

	gulp.watch(dist(config.manifest)).on('change', bs.reload)
})

gulp.task('deploy:gh-pages', function () {
	return gulp.src(dist('**', '*'))
		.pipe($.ghPages())
})

gulp.task('test', ['js:test'])

gulp.task('default', ['build'])
