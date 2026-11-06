// Service Worker PWA para e-Sigma Ágape
const CACHE_NAME = 'agape-pwa-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/icone-agape.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.debug('Cache PWA e-Sigma Ágape inicial registrado com avisos:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Removendo cache PWA legado:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()).then(async () => {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'NOVA_VERSAO_DISPONIVEL' });
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca interferir em requisições de API, endpoints de autenticação ou métodos que não sejam GET
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.includes('/auth/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // index.html ou navegação SPA: SEMPRE Network First (garante pegar o código mais recente)
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('/index.html')) || (await cache.match('/'));
        })
    );
    return;
  }

  // Assets estáticos com hash (.js e .css do Vite): Cache First com revalidação
  if (url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|woff2?|ico)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
    );
    return;
  }
});
