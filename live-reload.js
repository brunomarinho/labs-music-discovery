const browserSync = require('browser-sync');
const nodemon = require('nodemon');
const path = require('path');
const chokidar = require('chokidar');

// Port where BrowserSync will proxy our app
const PROXY_PORT = process.env.PORT || 3000;
// Port where BrowserSync UI will run
const UI_PORT = 3001;
// Port where BrowserSync will serve the proxied app
const BROWSER_SYNC_PORT = 3002;

// Initialize Nodemon
nodemon({
  script: 'server.js',
  watch: ['server.js', 'server-cache.js', 'cache-builder.js'],
  ext: 'js,json',
  env: { 'NODE_ENV': 'development' }
});

// Nodemon events
nodemon.on('start', () => {
  console.log('Nodemon started');
  startBrowserSync();
});

nodemon.on('restart', () => {
  console.log('Nodemon restarting...');
});

let browserSyncInitialized = false;

// Start BrowserSync
function startBrowserSync() {
  if (browserSyncInitialized) return;
  
  setTimeout(() => {
    browserSyncInitialized = true;
    
    browserSync.init({
      proxy: {
        target: `http://localhost:${PROXY_PORT}`,
        ws: true // Enable WebSockets proxy
      },
      port: BROWSER_SYNC_PORT,
      ui: {
        port: UI_PORT
      },
      files: [
        // Watch HTML files
        './index.html',
        './results.html',
        './components/**/*.html',

        // Watch JS files (excluding server files which are handled by nodemon)
        './js/**/*.js'
      ],
      injectChanges: true, // This enables CSS injection without full page reload
      reloadOnRestart: true, // Reload browsers when nodemon restarts
      watchOptions: {
        ignoreInitial: true,
        ignored: ['node_modules']
      },
      codeSync: true, // Sync code changes
      notify: true,
      open: false, // Don't open browser automatically
      logLevel: 'info',
      ghostMode: false // Disable mirroring clicks, scrolls, etc. across browsers
    });

    console.log(`\n-----------------------------------`);
    console.log(`🚀 Live-reload active!`);
    console.log(`📱 App: http://localhost:${BROWSER_SYNC_PORT}`);
    console.log(`⚙️  BrowserSync UI: http://localhost:${UI_PORT}`);
    console.log(`-----------------------------------\n`);

    // Set up a dedicated CSS watcher with chokidar for reliable CSS injection
    const cssWatcher = chokidar.watch('./css/**/*.css', {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });

    cssWatcher.on('change', (path) => {
      console.log(`CSS file changed: ${path}`);
      browserSync.reload('*.css');
    });

    console.log('CSS watcher initialized');
  }, 1000); // Give server time to start
}