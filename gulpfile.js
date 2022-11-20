"use strict";

var gulp = require("gulp"),
    cache = require('gulp-cache'),
    scss = require('gulp-sass')(require('sass')),
    fibers = require('fibers'),
    dartSsss = require('dart-sass'),
    sourcemaps = require ('gulp-sourcemaps'),
    postcss = require ('gulp-postcss'),
    autoprefixer = require ('autoprefixer'),
    nodemon = require('gulp-nodemon'),
    browserSync = require('browser-sync').create(),
    babel = require('gulp-babel'),
    del = require('del'),
    concat = require('gulp-concat'),
    concatCss = require('gulp-concat-css'),
    cleanCSS = require('gulp-clean-css'),
    data = require('gulp-data'),
    imagemin = require('gulp-imagemin'),
    htmlbeautify = require('gulp-html-beautify'),
    plumber = require('gulp-plumber'),
    spritesmith = require('gulp.spritesmith'),
    buffer = require('vinyl-buffer'),
    merge = require('merge-stream'),
    uglify = require('gulp-uglify'),
    handlebars = require('gulp-handlebars'),
    wrap = require('gulp-wrap'),
    declare = require('gulp-declare');

var autoPrefixerOption = {
    postcss: [ autoprefixer ({overrideBrowserslist: ['last 2 versions']})]
};

var SRC_PATH = {
    FONTS : 'src/assets/fonts/*.*',
    IMAGES : 'src/assets/images/**/*.*',
    SCSS : 'src/assets/scss/**/*.*',
    JS : 'src/assets/js/**/*.*',
    VENDOR: {
        CSS : 'src/assets/vendor/css/**/*.*',
        JS : 'src/assets/vendor/js/**/*.*'
    }

}
var BUILD_PATH = {
    FONTS : 'build/assets/fonts',
    IMAGES : 'build/assets/images',
    CSS : 'build/assets/css',
    JS : 'build/assets/js',
    VENDOR : {
        CSS :'build/assets/vendor/css',
        JS: 'build/assets/vendor/js'
    }
}


gulp.task('copy:fonts',async function () {
    return gulp.src(SRC_PATH.FONTS)
        .pipe(plumber())
        .pipe(gulp.dest(BUILD_PATH.FONTS))
        .pipe(browserSync.reload({ stream : true }));
});

gulp.task('images:minify', async function () {
    return gulp.src(SRC_PATH.IMAGES)
        .pipe(plumber())
        .pipe(cache(imagemin({ optimizationLevel: 7, progressive: true, interlaced: true })))
        .pipe(gulp.dest(BUILD_PATH.IMAGES))
        .pipe(browserSync.reload({ stream : true }));
});

gulp.task('images:sprite', async function() {
    var spConfig = {
        targetImgPath: './src/assets/sprite/*.png',
        targetRetinaImgPath: './src/assets/sprite/*@2x.png',
        destImgName: 'sprite.png',
        destRetinaImgName: 'sprite2x.png',
        destCssName: '_sprite.scss',
        destImgPath: './build/assets/images/sprite',
        destCssPath: './src/assets/scss/import',
        destCssTemplate:'./src/assets/sprite/handlebarsStr.css.handlebars'
    }
    var spriteData = gulp.src(spConfig.targetImgPath)
        .pipe(plumber())
        .pipe(spritesmith({
            retinaSrcFilter: spConfig.targetRetinaImgPath,
            imgName: spConfig.destImgName,
            retinaImgName: spConfig.destRetinaImgName,
            padding: 5,
            cssName: spConfig.destCssName,
            cssTemplate: spConfig.destCssTemplate,
        }));

    var imgStream = spriteData.img
        .pipe(buffer())
        .pipe(plumber())
        .pipe(cache(imagemin()))
        .pipe(gulp.dest(spConfig.destImgPath));

    var cssStream = spriteData.css
        .pipe(buffer())
        .pipe(plumber())
        .pipe(gulp.dest(spConfig.destCssPath));

    return merge(imgStream, cssStream)
        .pipe(buffer())
        .pipe(browserSync.reload({ stream : true }));
});

gulp.task('scss:dev', async function () {
    return gulp.src('src/assets/scss/**/*.scss')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(scss({
            fiber:fibers,
            outputStyle: 'expanded', //compressed , expanded
            indentType: 'space',
            indentWidth: 1,
            compiler: dartSsss,
        })).on('error', scss.logError)
        .pipe(postcss(autoPrefixerOption.postcss))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('build/assets/css'))
        .pipe(browserSync.reload({ stream : true }));
})

gulp.task('scss:build', async function () {
    var options = {
        postcss: [ autoprefixer ({overrideBrowserslist: ['last 2 versions']})]
    };
    return gulp.src('src/assets/scss/**/*.scss')
        .pipe(plumber())
        .pipe(scss({
            fiber:fibers,
            outputStyle: 'compressed', //compressed , expanded
            indentType: 'space',
            indentWidth: 1,
            compiler: dartSsss,
        })).on('error', scss.logError)
        .pipe(postcss(options.postcss))
        .pipe(gulp.dest('build/assets/css'))
        .pipe(browserSync.reload({ stream : true }));
})

gulp.task('templates', function(){
    gulp.src('src/templates/*.*/*.hbs')
        .pipe(handlebars())
        .pipe(wrap('Handlebars.template(<%= contents %>)'))
        .pipe(declare({
            namespace: 'MyApp.templates',
            noRedeclare: true, // Avoid duplicate declarations
        }))
        .pipe(concat('templates.js'))
        .pipe(gulp.dest('build/js/'));
});

gulp.task('script:dev', async function() {
    return gulp.src('src/assets/js/**/*.js')
        .pipe(plumber())
        .pipe( sourcemaps.init())
        .pipe(babel({'presets':['@babel/preset-env']}))
        .pipe(concat('common-pub.min.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('build/assets/js'))
        .pipe(browserSync.reload({ stream : true }));
});

gulp.task('script:build', async function() {
    return gulp.src('src/assets/js/**/*.js')
        .pipe(plumber())
        .pipe(babel({'presets':['@babel/preset-env']}))
        .pipe(uglify())
        .pipe(concat('common-pub.min.js'))
        .pipe(gulp.dest('build/assets/js'))
        .pipe(browserSync.reload({ stream : true }));
});

gulp.task('vendorJs:build', async function() {
    return gulp.src('src/assets/vendor/js/*.js')
        .pipe(plumber())
        .pipe(concat('vendor.js'))
        .pipe(gulp.dest('build/assets/js/vendor'))
        .pipe(browserSync.reload({ stream : true }));
});

gulp.task('vendorCss:build', async function() {
    return gulp.src('src/assets/vendor/css/*.css')
        .pipe(plumber())
        .pipe(concatCss('vendor.css'))
        .pipe(cleanCSS({debug: true}, (details) => {
            console.log(`${details.name}: ${`original size : ` + details.stats.originalSize}`);
            console.log(`${details.name}: ${`minify size : ` + details.stats.minifiedSize}`);
        }))
        .pipe(gulp.dest('build/assets/css/vendor'))
        .pipe(browserSync.reload({ stream : true }));
});

var watchCommon = function () {
    gulp.watch('src/pages/**/**/**/*.+(html|njk)', gulp.series(['template:build']))
    gulp.watch('src/assets/images/**/*.*', gulp.series(['images:minify']))
    gulp.watch('src/assets/fonts/**/*.*', gulp.series(['copy:fonts']))
    gulp.watch('src/assets/vendor/js/**/*.js', gulp.series(['vendorJs:build']))
    gulp.watch('src/assets/vendor/css/**/*.js', gulp.series(['vendorCss:build']))
    gulp.watch('src/assets/sprite/**/*.png', gulp.series(['images:sprite']))
}

gulp.task('clean', async function () {
    return del('build');
})

gulp.task('watch:dev', async function()  {
    return [
        gulp.watch('src/assets/scss/**/**/*.scss', gulp.series(['scss:dev'])),
        gulp.watch('src/assets/js/**/*.js', gulp.series(['script:dev'])),
        watchCommon
    ]
});

gulp.task('watch:build', async function()  {
    return [
        gulp.watch('src/assets/js/**/*.js', gulp.series(['script:build'])),
        gulp.watch('src/assets/scss/**/**/*.scss', gulp.series(['scss:build'])),
        watchCommon
    ]
});

gulp.task('webServer', async function() {
    return nodemon({
        script: 'server.js' ,
        watch: 'server'
    });
});

gulp.task('browserSync', async function() {
    browserSync.init(null,{
            proxy: 'http://localhost:8005/',
            port: 8006,
        }
    );
    gulp.watch('src/pages/**/*.+(html|njk)', gulp.series(['template']))
    gulp.watch('src/templates/**/*.njk', gulp.series(['template']))
    gulp.watch('src/**/*.json', gulp.series(['template']))
});

// 실행기
gulp.task("dev", async function(){gulp.series(['clean']);});
gulp.task("build", async function(){gulp.series([]);});
gulp.task("deploy", async function(){gulp.series([]);});
