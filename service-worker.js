/*  Service Worker для “Speech Test”  */
const CACHE = 'briefings-cache-v6';

/* Файлы, которые нужны оф-лайн сразу после установки */
const PRECACHE = [
  './index.html',
  './manifest.json'
];

/* ——— helper: нормализуем ключи ——— */
function normalize(request) {
  const url = new URL(request.url);

  /* Корень сайта → ./index.html */
  if (url.origin === location.origin && url.pathname === '/') {
    return new Request('./index.html', { mode: 'same-origin' });
  }

  /* Убираем query-строку, чтобы /index.html?… не плодил дубликаты */
  url.search = '';
  return new Request(url, {
    mode: request.mode,
    credentials: request.credentials
  });
}

/* ---------- INSTALL ---------- */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      await Promise.all(
  PRECACHE.map(async url => {
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await cache.put(normalize(new Request(url)), response);
    } catch (err) {
      console.error(`❌ Failed to precache ${url}:`, err);
    }
  })
);

    })
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', event => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(n => (n === CACHE ? null : caches.delete(n))))
    )
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', event => {
  const { request } = event;

  /* Навигации → всегда index.html */
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(normalize(new Request('./index.html')))
            .then(resp => resp || fetch(request))
    );
    return;
  }

  /* Статика: cache-first, затем сеть с сохранением */
  event.respondWith(
    caches.match(normalize(request)).then(
      cached => cached ||
        fetch(request).then(networkResp => {
          if (
            networkResp.ok &&
            networkResp.url.startsWith(self.location.origin)
          ) {
            caches.open(CACHE)
                  .then(c => c.put(normalize(request), networkResp.clone()));
          }
          return networkResp;
        }).catch(() => caches.match(normalize(new Request('./index.html'))))
    )
  );
});
