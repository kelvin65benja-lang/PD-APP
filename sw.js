/* PD APP service worker — offline-first shell + safe runtime caching. */
const VERSION = 'pd-app-v2-coastal';
const SHELL = `pd-shell-${VERSION}`;
const RUNTIME = `pd-runtime-${VERSION}`;
const PRECACHE = [
  '/', '/index.html', '/manifest.json',
  '/assets/css/pd-upgrade.css', '/assets/js/pd-upgrade.js',
  '/icons/icon-192.png', '/icons/icon-512.png',
  '/images/banner-services.svg', '/images/banner-emergency.svg',
  '/images/banner-report.svg', '/images/banner-weather.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => ![SHELL, RUNTIME].includes(k)).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  if(req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(SHELL).then(c => c.put('/index.html', copy));
      return res;
    }).catch(() => caches.match('/index.html')));
    return;
  }

  if(url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
      if(res.ok) caches.open(RUNTIME).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req))));
    return;
  }

  // Network-first for weather/API/font requests; use the last cached response offline.
  event.respondWith(fetch(req).then(res => {
    if(res.ok && (url.hostname.includes('open-meteo.com') || url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com'))){
      caches.open(RUNTIME).then(c => c.put(req, res.clone()));
    }
    return res;
  }).catch(() => caches.match(req)));
});
