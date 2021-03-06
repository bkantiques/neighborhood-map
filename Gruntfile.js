module.exports = function(grunt) {

    // 1. All configuration goes here
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            options: {
                separator: '\n'
            },
            // Concats local css into one file to reduce requests
            css: {
                src: ['src/css/normalize.css', 'src/css/style.css'],
                dest: 'src/css/concat/style.css'
            },
            // Concats local js into one file to reduce requests
            js: {
                src: ['src/js/sammy.js', 'src/js/NeighborhoodDataValidator.js', 'src/js/PlaceDataValidator.js', 'src/js/app.js'],
                dest: 'src/js/concat/app.js'
            }
        },

        // Adds css prefixes
        autoprefixer: {
            dist: {
                files: {
                    'src/css/style.css': 'src/css/sassed/style.css'
                }
            }
        },

        uglify: {
            // Minifies concatenated js and puts in dist folder
            build: {
                files: {
                    'dist/js/app.min.js': 'src/js/concat/app.js'
                }
            }
        },

        cssmin: {
            // Minifies concatenated css and pputs in dist folder
            build: {
                files: {
                    'dist/css/style.min.css': 'src/css/concat/style.css'
                }
            }
        },

        sass: {
            src: {
                files: {
                    'src/css/sassed/style.css': 'src/css/style.scss'
                }
            }
        },

        processhtml: {
            build: {
                files: {
                    'dist/index.html': 'src/index.html'
                }
            }
        },

        watch: {
            dist: {
                files: ['src/css/*.scss','src/index.html', 'src/js/*.js'],
                tasks: ['build'],
                options: {
                    livereload: true
                }
            }
        },

        browserSync: {
            bsFiles: {
                src: [
                    'src/index.html',
                    'src/css/style.css',
                    'src/js/*.js'
                ]
            },
            options: {
                server: {
                    baseDir: './'
                },
                watchTask: true
            }
        }

    });

    require('load-grunt-tasks')(grunt);

    // 4. Register tasks
    grunt.registerTask('build', ['sass', 'autoprefixer', 'concat', 'cssmin', 'uglify', 'processhtml']);
    grunt.registerTask('watchSync', ['browserSync', 'watch']);

};