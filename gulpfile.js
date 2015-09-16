/**
 *
 *  Web Starter Kit
 *  Copyright 2014 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
'use strict';

// Include Gulp & Tools We'll Use

var gulp = require('gulp');
var gutil = require('gulp-util');
var $ = require('gulp-load-plugins')();
var rimraf = require('rimraf');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var pagespeed = require('psi');
var jade = require('gulp-jade');
var reload = browserSync.reload;
var path = require('path');
var rename = require("gulp-rename");
var source = require('vinyl-source-stream');
var watchify = require('watchify');
var browserify = require('browserify');
var fs = require('fs');
var globsync = require('glob-whatev');
var ignore = require('gulp-ignore');
var del = require('del');
var streamqueue = require('streamqueue');
var spritesmith = require('gulp.spritesmith');
var dir = require('node-dir');
var phantomas = require('phantomas'),
    task;
var grep = require('gulp-grep');
var sass = require('gulp-ruby-sass');
var mold =  require('mold-source-map');
var exorcist   = require('exorcist');


var paths = {
    lang: gutil.env.ar ? 'ar' : 'en',
    port: gutil.env.ar ? 3002 : 3003,
    layout: 'assets_solution/trunk/FlipMedia.CustomerFirst/Layouts/'
}

var mapfile = path.join(__dirname, 'app', paths.lang, 'scripts' ,'script.js.map')

// Lint JavaScript
gulp.task('jshint', function() {

    return gulp.src(['app/scripts/**/*.js', 'app/components/**/*.js', '!app/scripts/script.js', '!app/scripts/vendor/*.js'])
        .pipe($.jshint().on('error', gutil.log).on('error', gutil.beep))
        .pipe($.jshint.reporter('jshint-stylish'))
        .pipe($.jshint.reporter('fail'))
        .pipe(reload({
            stream: true,
            once: true
        }));
});

// Jade tasks
gulp.task('jade', function() {
    var YOUR_LOCALS = {};

    gulp.src('./app/' + paths.lang + '/pages/*.jade')
        .pipe(jade({
            locals: YOUR_LOCALS,
            pretty: true
        }))
        .on('error', function(e) {
            gutil.log(e)
            gutil.beep()
            this.emit('end');
        })
        .pipe(gulp.dest('./app/' + paths.lang))
});

//Jade replace mixin path
gulp.task('sppath', function() {
    gulp.src('./app/' + paths.lang + '/**/*.jade')
        .pipe($.replace(/\/\/-.?@mixin/g, 'include ../../pages/shared/_mixin'))
        .pipe($.replace(/extend ..\/pages\/shared\/_master/g, ''))
        .pipe(gulp.dest('./.tmp/'));
})

// Jade SP Components tasks
gulp.task('spJade', function() {
    gulp.src('./.tmp/**/*.jade')
        .pipe(jade({
            pretty: true
        }))
        .pipe(gulp.dest('./spmodules/'));
});

// Path replacer SP Components tasks
gulp.task('spPathJade', function() {

    // var url = '_layouts/15/DubaiIslamicBank/en-us/';
    var url = "../_catalogs/masterpage/dib/en/";
    var styleUrl = "dib/en/";

    gulp.src('./spmodules/**/*.html')
        // .pipe(rename(function(path){
        //   console.log(path)
        // }))
        .pipe($.replace(/(styles\/)/g, styleUrl + '$1'))
        .pipe($.replace(/(scripts\/)/g, styleUrl + '$1'))
        .pipe($.replace(/(images\/)/g, url + '$1'))
        .pipe(gulp.dest('./spmodules/'));

    // gulp.src('./spmodules/components/**/*.html')
    //     .pipe($.replace(/(images\/)/g, url+'$1'))
    //     .pipe(gulp.dest('./spmodules/components/'))
});

// Clean spmodules folder
gulp.task('spClean', function(cb) {
    rimraf('./spmodules', cb);
});

gulp.task('tmpClean', function(cb) {
    rimraf('./.tmp', cb);
    // return gulp.src('./.tmp/**/*.jade', { read: false }) // much faster
    // .pipe($.rimraf());
});

gulp.task('spmodules', ['spClean'], function(cb) {
    runSequence('sppath', 'spJade', 'spPathJade', cb);
});

//Clear Image cache
gulp.task('clearCache', function(done) {
    return $.cache.clearAll(done);
});

// Optimize Images
gulp.task('images', function() {
    return gulp.src('app/' + paths.lang + '/images/**/*')
        .pipe($.cache($.imagemin({
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest('dist/' + paths.lang + '/images'))
        .pipe(reload({
            stream: true,
            once: true
        }))
        .pipe($.size({
            title: 'images'
        }));
});

// Automatically Prefix CSS
gulp.task('styles:css', function() {
    return gulp.src('app/' + paths.lang + '/styles/**/*.css')
        .pipe($.autoprefixer('last 1 version'))
        .pipe(gulp.dest('app/' + paths.lang + '/styles'))
        .pipe(reload({
            stream: true
        }))
        .pipe($.size({
            title: 'styles:css'
        }));
});

// Compile Sass For Style Guide Components (app/styles/components)
/*gulp.task('styles:components', function() {
    return gulp.src('app/styles/components/components.scss')
        .pipe($.rubySass({
            style: 'expanded',
            precision: 10,
            loadPath: ['app/styles/components']
        }))
        .pipe($.autoprefixer('last 1 version'))
        .pipe(gulp.dest('app/styles/components'))
        .pipe($.size({
            title: 'styles:components'
        }));
});*/
var compCss = [];

var excludeSCSSFiles = grep(function(file) {
    return !file["_contents"].toString().match(/\/\*@import-exclude\*\//);
})

gulp.task('styles:main', function() {
    return gulp.src(['app/' + paths.lang + '/components/**/*.scss'])
        .pipe(excludeSCSSFiles)
        .pipe($.rename(function(path) {
            compCss.push('@import "../components/' + path.dirname + "/" + path.basename + '"');
        }));
});


// Compile Any Other Sass Files You Added (app/styles)
gulp.task('styles:scss', function() {

    var compCssItems = compCss.join(';\n') + '';
    var regExp = /(\/\*.*@import start.*\*\/)([\s\S]*)(\/\*.*@import end.*\*\/)/;
    var string = '/*@import start*/\n{{val}}\n/*@import end*/';

    gulp.src(['app/' + paths.lang + '/styles/scss/main.scss'])
        .pipe($.replace(regExp, function(file) {
            return string.replace('{{val}}', compCssItems)
        }))
        .pipe(gulp.dest('app/' + paths.lang + '/styles/scss/'))
        .pipe($.size({
            title: 'styles:mainscss'
        }));

    return streamqueue({
            objectMode: true
        },
        gulp.src(['app/' + paths.lang + '/styles/**/*.scss', '!app/styles/components/components.scss'])
        .pipe(sass({
            style: 'expanded',
            precision: 10,
            loadPath: ['app/' + paths.lang + '/styles'],
            sourcemap: true,
            debug: false
        }).on('error', gutil.log).on('error', gutil.beep))
        .pipe($.autoprefixer('last 1 version'))
        .pipe(rename(function(path) {
            path.dirname = './'
        }))
        .pipe(gulp.dest('app/' + paths.lang + '/styles'))
        .pipe($.size({
            title: 'styles:scss'
        })),

        gulp.src('app/' + paths.lang + '/styles/**/*.css')
        .pipe($.autoprefixer('last 1 version'))
        .pipe(gulp.dest('app/' + paths.lang + '/styles'))
        .pipe(reload({
            stream: true
        }))
        .pipe($.size({
            title: 'styles:css'
        }))
    );
});

//Browserify AMD module
gulp.task('browserify', function() {
    //Exclude files array
    var b = browserify()
    b.add('./app/' + paths.lang + '/scripts/main.js');
    gulp.src(['./app/' + paths.lang + '/components/**/*.js', './app/' + paths.lang + '/scripts/main.js'])
        .pipe(grep(function(file, a) {
            if (!file["_contents"].toString().match(/@external/)) {

                var expose = path.basename(file.path, '.js');

                b.require(file.path, {
                    expose: expose
                });

                b.bundle({ debug: true })
                    .on('error', function(e) {
                        gutil.log(e)
                        gutil.beep()
                        this.emit('end');
                    })
                    .pipe(exorcist(mapfile))
                    .pipe(source('script.js'))
                    .pipe(gulp.dest('app/' + paths.lang + '/scripts/'));

            } else {
                var expose = path.basename(file.path, '.js');
                new browserify().require(file.path, {expose: expose})
                    .bundle({ debug: true })
                    .on('error', function(e) {
                        gutil.log(e)
                        gutil.beep()
                        this.emit('end');
                    })
                    .pipe(source(expose + '.js'))
                    .pipe(gulp.dest('app/' + paths.lang + '/scripts/'));
            };
        }))
});

// Output Final CSS Styles
// gulp.task('styles', ['styles:components', 'styles:scss', 'styles:css']);
// gulp.task('styles', ['styles:scss', 'styles:css']);
gulp.task('styles', ['styles:scss']);

// Scan Your HTML For Assets & Optimize Them
gulp.task('html', function() {
    return gulp.src('app/' + paths.lang + '/**/*.html')
        // .pipe($.useref.assets({
        // searchPath: '{.tmp,app}'
        // }))
        // Concatenate And Minify JavaScript
        // .pipe($.if('*.js', $.uglify()))
        // Concatenate And Minify Styles
        // .pipe($.if('*.css', $.csso()))
        // Remove Any Unused CSS
        // Note: If not using the Style Guide, you can delete it from
        // the next line to only include styles your project uses.
        // .pipe($.if('*.css', $.uncss({
        //     html: ['app/index.html', 'app/styleguide/index.html']
        // })))
        // .pipe($.useref.restore())
        // .pipe($.useref())
        // Update Production Style Guide Paths
        // .pipe($.replace('components/components.css', 'components/main.min.css'))
        // Minify Any HTML
        // .pipe($.minifyHtml())
        // Output Files
        .pipe(gulp.dest('dist/' + paths.lang))
        .pipe($.size({
            title: 'html'
        }));
});

//CSS sprite generation
gulp.task('sprite', function() {
    var spriteData = gulp.src('app/' + paths.lang + '/images/icons/*.png').pipe(spritesmith({
        imgName: 'sprite.png',
        cssName: '_sprite.scss',
        algorithm: 'binary-tree',
        padding: 20
    }));
    spriteData.img.pipe(gulp.dest('app/' + paths.lang + '/images/'));
    spriteData.css.pipe(gulp.dest('app/' + paths.lang + '/styles/scss/'));
});

// Clean Output Directory
gulp.task('clean', function(cb) {
    rimraf('dist', rimraf.bind({}, '.tmp', cb));
});


// Watch Files For Changes & Reload
gulp.task('serve', function() {
    browserSync.init(null, {
        server: {
            // baseDir: ['app', '.tmp'],
            baseDir: ['app'],
            directory: true,
            port: path.port
        },
        notify: false
    });

    gulp.start('styles:main');

    // runSequence('styles:main', ['browserify', 'sprite', 'styles', 'jade'], function() {
    //     console.log("Initialization done!! - browserify, sprite, styles, jade")
    // });

    var watchHtml = 'app/' + paths.lang + '/**/*.html';
    var scssMain = 'app/' + paths.lang + '/styles/**/*.scss';
    var scssComp = 'app/' + paths.lang + '/components/**/*.scss';
    var css = 'app/' + paths.lang + '/styles/**/*.css';
    var js = 'app/' + paths.lang + '/**/*.js';
    var imgs = 'app/' + paths.lang + '/images/**/*';
    var icons = 'app/' + paths.lang + '/images/icons/**/*';
    var jade = 'app/' + paths.lang + '/**/*.jade';

    // gulp.watch(['app/**/*.html'], reload);
    gulp.watch([watchHtml]);
    gulp.watch([scssMain, scssComp], ['styles']);
    gulp.watch([css], reload);
    // gulp.watch(['app/scripts/**/*.js'], ['jshint']);
    gulp.watch([js], ['browserify']);
    gulp.watch([imgs], ['images']);
    gulp.watch([jade], ['jade']);
    gulp.watch([icons], ['sprite']);
});

gulp.task('copyDist', function(cb) {
    return gulp.src([
            '!app/' + paths.lang + '/config',
            '!app/' + paths.lang + '/pages/**/*',
            '!app/' + paths.lang + '/pages',
            '!app/' + paths.lang + '/pagelayout/**/*',
            '!app/' + paths.lang + '/pagelayout',
            '!app/' + paths.lang + '/components/**/*',
            '!app/' + paths.lang + '/components',
            '!app/' + paths.lang + '/styles/scss',
            '!app/' + paths.lang + '/styles/**/*.scss',
            '!app/' + paths.lang + '/images/**/*',
            '!app/' + paths.lang + '/images',
            '!app/' + paths.lang + '/bower_components',
            '!app/' + paths.lang + '/scripts/main.js',
            '!app/' + paths.lang + '/scripts/common.js',
            'app/' + paths.lang + '/**/'
        ])
        .pipe(gulp.dest('dist/' + paths.lang + '/'));
})

// Build Production Files
gulp.task('build', function(cb) {

    del('dist/', function() {

        gutil.log('Delete:', gutil.colors.yellow('Distribution folder cleaned.'));

        runSequence('styles:main', ['styles', 'clearCache'], function() {
            gulp.start('copyDist');
            gulp.start('images');
        });

    })
});

// Build Production Files
gulp.task('dev', function(cb) {

    var filestoDel = [
        'dev/**/*.png',
        'dev/**/*.jpg',
        'dev/**/*.svg',
        'dev/**/*.ttf',
        'dev/**/*.woff',
        'dev/**/*.eot',
        'dev/**/*.html',
        'dev/**/*.txt',
        'dev/**/*.json',
        'dev/**/*.webapp',
        'dev/**/*.ico',
        'dev/**/*.js',
        'dev/**/*.css'
    ]

    var filestoCopy = [
        'app/images/**/*',
        'app/*',
        'app/data/*',
        '!app/config',
        '!app/pages',
        '!app/pagelayout',
        '!app/components',
        '!app/bower_components',
        'app/styles/**/*.css',
        'app/scripts/**/*.js',
        '!app/scripts/main.js',
        '!app/scripts/common.js'
    ];

    del(filestoDel, function(err) {
        gutil.log('Delete:', gutil.colors.green('Development folder cleared.'));
        gutil.beep();


        gulp.src(filestoCopy, {
                base: './app/' + paths.lang
            })
            .pipe(gulp.dest('dev/'))
            .pipe($.size({
                title: 'development'
            }));

        browserSync.init(null, {
            server: {
                baseDir: ['dev'],
                directory: true,
                port: 3005
            },
            notify: false
        });
    });

});

gulp.task('development', function() {
    gulp.start('dev');
});


gulp.task('solution', function() {

    var enStyle = paths.layout + '/1033/STYLES/FlipMedia.CustomerFirst/styles';
    var arStyle = paths.layout + '/1025/STYLES/FlipMedia.CustomerFirst/styles';

    var enScript = paths.layout + '/1033/STYLES/FlipMedia.CustomerFirst/scripts';
    var arScript = paths.layout + '/1025/STYLES/FlipMedia.CustomerFirst/scripts';

    gulp.src(['./app/en-us/styles/main.css'])
        .pipe(gulp.dest(enStyle))
        .pipe($.size({
            title: 'En Main.css added'
        }));

    gulp.src(['./app/ar-ae/styles/main.css'])
        .pipe(gulp.dest(arStyle))
        .pipe($.size({
            title: 'Ar Main.css added'
        }));

    gulp.src(['./app/en-us/styles/responsive.css'])
        .pipe(gulp.dest(enStyle))
        .pipe($.size({
            title: 'En Responsive.css added'
        }));

    gulp.src(['./app/ar-ae/styles/responsive.css'])
        .pipe(gulp.dest(arStyle))
        .pipe($.size({
            title: 'Ar Responsive.css added'
        }));

    gulp.src(['./app/en-us/scripts/script.js'])
        .pipe(gulp.dest(enScript))
        .pipe($.size({
            title: 'En script.js added'
        }));

    gulp.src(['./app/ar-ae/scripts/script.js'])
        .pipe(gulp.dest(arScript))
        .pipe($.size({
            title: 'Ar script.js added'
        }));


});



// Default Task
gulp.task('default', ['clean'], function(cb) {
    gulp.start('styles:main');
    gulp.start('build', cb);
});

// Run PageSpeed Insights
// Update `url` below to the public URL for your site
gulp.task('pagespeed', pagespeed.bind(null, {
    // By default, we use the PageSpeed Insights
    // free (no API key) tier. You can use a Google
    // Developer API key if you have one. See
    // http://goo.gl/RkN0vE for info key: 'YOUR_API_KEY'
    url: 'https://example.com',
    strategy: 'mobile'
}));


// Performance metrics
gulp.task('perf', function(cb) {
    // console.log(phantomas.version); // 1.0.0
    // console.log(phantomas.metadata.metrics);
    // console.log('phantomas v%s loaded from %s', phantomas.version, phantomas.path);

    var options = {};

    task = phantomas('http://localhost:3002/010_dib016_intranet_homepage_o1_v2.html', options, function(err, json, results) {
        // err: exit code
        // json: parsed JSON with raw results
        // results: results object with metrics values, offenders, asserts data
        fs.writeFile("./perfReport/report.json", JSON.stringify(json), function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log("The file was saved!");
            }
        });

    });
    // console.log(task.pid); // process ID
    // Streams handling
    // task.stdout.pipe(process.stdout);
    // task.stderr.pipe(process.stderr);

    task.on('results', function(results) {
        // console.log(results);
    });

    // Events handling
    task.on('progress', function(progress) {
        // reports page loading progress
        // console.log(progress);
    });

    task.on('milestone', function(milestone) {
        // reports page loading milestone - first byte received, onDOMReady, window.onload
        // console.log(milestone);
    });

    task.on('log', function(msg) {
        // emitted on every log message sent by phantomas
        console.log(msg)
    });


});
