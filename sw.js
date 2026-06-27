const CACHE_NAME = 'qurani-cache-v2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/data/quran.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude audio files from caching as requested ("عدا الاصوات")
  const isAudio = url.pathname.endsWith('.mp3') || 
                  url.pathname.endsWith('.wav') || 
                  url.hostname.includes('everyayah.com') || 
                  url.pathname.includes('/audio/');

  // For audio, range requests or non-GET requests, bypass cache
  if (isAudio || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Stale-While-Revalidate Strategy
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          return cachedResponse;
        });

        return cachedResponse || fetchPromise;
      });
    })
  );
});
