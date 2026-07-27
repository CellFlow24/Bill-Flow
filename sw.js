const CACHE_NAME = 'billflow-v25';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  // Never cache API calls to Google Sheets, only cache the UI shell
  if (e.request.method !== 'GET' || e.request.url.includes('script.google.com')) {
      return;
  }
  
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
