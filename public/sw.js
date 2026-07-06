/**
 * FitCore Service Worker
 *
 * Strategy:
 * - Static Assets (JS, CSS, Images, Fonts): Cache First
 * - Navigation (Pages): Network First, fallback to cached App Shell (/)
 * - Server Functions & AI: Network Only (No Caching)
 */

const CACHE_NAME = 'fitcore-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png'
];

// Install: Cache core app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests
  if (request.method !== 'GET') return;

  // 2. Ignore server functions, AI endpoints, and external API calls
  // This ensures "honest" offline behavior for dynamic data.
  if (
    url.pathname.startsWith('/_server') ||
    url.pathname.includes('ai.functions') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // 3. Navigation requests (HTML pages)
  // Network first, fallback to cached root (App Shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/');
      })
    );
    return;
  }

  // 4. Static assets (JS, CSS, Images)
  // Cache first, then network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        // Only cache valid responses from our own origin
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Dynamically cache versioned assets (Vite assets have hashes)
        const isAsset = url.pathname.includes('/assets/') ||
                        /\.(js|css|png|jpg|jpeg|svg|woff2?|json)$/.test(url.pathname);

        if (isAsset) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return networkResponse;
      });
    })
  );
});
