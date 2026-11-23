/**
 * SYNCRO — Service Worker PWA (v2 Comercial Modular)
 * Cachea el shell modular (HTML, css/, src/) y omite llamadas a APIs externas o analítica.
 */

const CACHE_NAME = 'syncro-commercial-v3-n8n';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './app.html',
  './privacidad.html',
  './terminos.html',
  './manifest.json',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/views.css',
  './css/landing.css',
  './css/chatbot.css',
  './n8n-config.js',
  './src/config.js',
  './src/core/state.js',
  './src/services/analyticsService.js',
  './src/services/authService.js',
  './src/services/dbService.js',
  './src/services/aiService.js',
  './src/services/ecoService.js',
  './src/services/n8nService.js',
  './src/modules/timer.js',
  './src/modules/calendar.js',
  './src/modules/biome.js',
  './src/modules/journal.js',
  './src/modules/chatbot.js',
  './src/ui/modals.js',
  './src/main.js',
  './src/landing.js',
  './dist/app.bundle.js',
  './dist/landing.bundle.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Nunca interceptar analítica ni llamadas a Supabase / Edge Functions
  if (
    url.hostname.includes('posthog.com') ||
    url.hostname.includes('plausible.io') ||
    url.hostname.includes('mixpanel.com') ||
    url.hostname.includes('supabase.co') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
