// SnapFilters service worker — enables offline use after the first visit.
//
// Strategy:
//  • Navigations  → network-first, falling back to the cached app shell so the
//    page still opens when offline.
//  • Everything else (JS/CSS/SVG/GLB/draco + the MediaPipe CDN scripts) →
//    cache-first with a background network fill, so assets load instantly and
//    keep working offline once they have been fetched once.
//
// Camera access (getUserMedia) is hardware, not network, so the live filters
// keep working offline — only the very first load needs a connection.

const CACHE = 'snapfilters-v1';

self.addEventListener('install', (event) => {
  // Pre-cache the app shell so a navigation works offline immediately.
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Drop old cache versions.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // App shell for page navigations.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put('./index.html', res.clone()));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))),
    );
    return;
  }

  // Cache-first for assets (same-origin) and the MediaPipe CDN.
  const url = new URL(request.url);
  const cacheable =
    url.origin === self.location.origin || url.hostname === 'cdn.jsdelivr.net';
  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
