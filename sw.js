/* ============ SYNCRO SERVICE WORKER (PWA Offline Cache) ============ */
const CACHE_NAME = 'syncro-cache-v7';

const STATIC_ASSETS = [
  './',
  './index.html',
  './app.html',
  './terminos.html',
  './privacidad.html',
  './manifest.json',
  './landing.css',
  './styles.css',
  './app.js'
];

// Instalación: Pre-cacheo de archivos nucleares
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activación: Limpieza de cachés antiguas y control inmediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Estrategia Resiliente
// - Navegación / HTML y Assets Locales (CSS, JS): Network-first con fallback a caché (siempre actualizado online, 100% funcional offline)
// - Fuentes y recursos externos: Cache-first con fallback a red
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navegación (documentos HTML)
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            if (cached) return cached;
            return caches.match('./app.html') || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Assets Locales de la App (CSS, JS, imágenes locales): Network-first con fallback a caché
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Assets externos (Google Fonts, CDNs): Cache-first con fallback a red
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => null);
    })
  );
});
