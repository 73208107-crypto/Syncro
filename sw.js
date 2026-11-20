/* ============ SYNCRO SERVICE WORKER (PWA Offline Cache) ============ */
const CACHE_NAME = 'syncro-cache-v5';

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

// Fetch: Estrategia Híbrida
// - Navegación / HTML: Network-first con fallback a caché (siempre actual con internet, pero 100% offline)
// - Estilos, Scripts, Fuentes y Assets: Cache-first con fallback a red y actualización dinámica
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
            // Si navega a una ruta desconocida estando offline, fallback a app.html o index.html
            return caches.match('./app.html') || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Assets estáticos (CSS, JS, Fonts, Images, Manifest)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            // Guardar en caché si es de nuestro origen o fuentes de Google
            if (url.origin === self.location.origin || url.hostname.includes('fonts.g')) {
              const resClone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
          }
          return networkRes;
        })
        .catch((err) => {
          // Si falla y es imagen, podríamos devolver fallback si fuera necesario
          return null;
        });
    })
  );
});
