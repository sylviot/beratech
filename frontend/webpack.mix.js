const mix = require('laravel-mix');

mix
  .sass('./assets/sass/maps.scss', './dist/css/maps.min.css')
  
  .js('./assets/js/maps.js', './dist/js/maps.min.js')

mix.browserSync({
  proxy: 'dev.hackathon.com.br',
  cors: false,
  injectChanges: true,
  files: [
    '!node_modules',
    '!vendor',
    '{*,**/*}.php',
    'dist/css/maps.min.css',
    'dist/js/maps.min.js',
  ],
  notify: false,
  ghostMode: false,
  port: 3002,
  reload: false,
  ui: {
    port: 3003,
  },
}).options({
  processCssUrls: false,
  terser: {
    extractComments: false,
  },
});
