const CACHE_NAME = 'billflow-v26';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './logo.png',
  './comp-logo.png',
  './icon-192.png',
  './icon-512.png'
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
