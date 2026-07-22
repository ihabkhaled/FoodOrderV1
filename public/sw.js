const CACHE_PREFIX = 'foodorder-v1-';
const CACHE_NAME = 'foodorder-v1-v1.7.1';
const LOCALE_SEGMENTS = [
  'ar',
  'it',
  'fa',
  'fr',
  'de',
  'es',
  'pt-br',
  'hi',
  'th',
  'zh-cn',
  'ja',
];
const PRECACHE_PATHS = [
  '/app.html',
  '/offline/',
  ...LOCALE_SEGMENTS.map((locale) => `/${locale}/offline/`),
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/maskable-icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];
const APP_PREFIXES = [
  '/app',
  '/auth',
  '/invite',
  '/buckets',
  '/sessions',
  '/orders',
  '/join',
  '/social',
  '/settings',
];
const CACHEABLE_DESTINATIONS = new Set(['font', 'image', 'script', 'style']);

const isApplicationPath = (pathname) =>
  APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

const localeOfflinePath = (pathname) => {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return LOCALE_SEGMENTS.includes(firstSegment)
    ? `/${firstSegment}/offline/`
    : '/offline/';
};

const cacheResponse = async (request, response) => {
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_PATHS.map((pathname) =>
          fetch(pathname, { cache: 'reload' })
            .then((response) =>
              response.ok ? cache.put(pathname, response) : undefined,
            )
            .catch(() => undefined),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname === '/ads.txt'
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) =>
          isApplicationPath(url.pathname)
            ? response
            : cacheResponse(request, response),
        )
        .catch(async () => {
          if (isApplicationPath(url.pathname)) {
            return (await caches.match('/app.html')) || Response.error();
          }
          return (
            (await caches.match(request)) ||
            (await caches.match(localeOfflinePath(url.pathname))) ||
            Response.error()
          );
        }),
    );
    return;
  }

  if (!CACHEABLE_DESTINATIONS.has(request.destination)) return;
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => cacheResponse(request, response)),
    ),
  );
});
