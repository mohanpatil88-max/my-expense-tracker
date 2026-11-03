
const CACHE = 'my-expense-tracker-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            key.startsWith('my-expense-tracker-') &&
            key !== CACHE
          )
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);

  // Never cache requests to Google or other external services.
  if (requestUrl.origin !== self.location.origin) return;

  // Always try the network first for app navigation.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE).then(cache =>
              cache.put('./index.html', copy)
            );
          }

          return response;
        })
        .catch(async () => {
          const cached = await caches.match('./index.html');

          if (cached) return cached;

          return new Response(
            'The app is unavailable offline. Please reconnect to the internet.',
            {
              status: 503,
              headers: {
                'Content-Type': 'text/plain; charset=utf-8'
              }
            }
          );
        })
    );

    return;
  }

  // Cache only the explicitly listed app assets.
  const isAppAsset = ASSETS.some(asset =>
    new URL(asset, self.location.href).href === request.url
  );

  if (!isAppAsset) return;

  event.respondWith(
    caches.match(request).then(async cached => {
      if (cached) return cached;

      try {
        const response = await fetch(request);

        if (response.ok) {
          const copy = response.clone();

          caches.open(CACHE).then(cache =>
            cache.put(request, copy)
          );
        }

        return response;
      } catch (error) {
        return new Response('App asset unavailable offline.', {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        });
      }
    })
  );
});
