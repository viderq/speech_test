/*  Service Worker: Aviation Briefings demo  */
const CACHE = 'briefings-cache-v3';

/*  Файлы, которые должны быть доступны офлайн сразу после установки  */
const PRECACHE = [
  './index.html',
  './manifest.json'
];

/* ---------- helper: нормализуем ключи ---------- */
function normalize(request) {
  const url = new URL(request.url);

  /* корень сайта → ./index.html */
  if (url.origin === location.origin && url.pathname === '/') {
    return new Request('./index.html', { mode: 'same-origin' });
  }

  /* убираем query-строку, чтобы /index.html?reload=1 не плодил дублей */
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
          const response = await fetch(url, { cache: 'no-cache' });
          await cache.put(normalize(new Request(url)), response);
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
      Promise.all(
        names.map(name => (name === CACHE ? null : caches.delete(name)))
      )
    )
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', event => {
  const { request } = event;

  /* Навигации → всегда index.html */
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
            .then(resp => resp || fetch(request))
    );
    return;
  }

  /* Остальные запросы: cache-first, затем сеть с сохранением */
  event.respondWith(
    caches.match(normalize(request)).then(
      cached => cached ||
        fetch(request).then(networkResp => {
          if (
            networkResp.ok &&
            networkResp.url.startsWith(self.location.origin)
          ) {
            caches.open(CACHE).then(cache =>
              cache.put(normalize(request), networkResp.clone())
            );
          }
          return networkResp;
        }).catch(() => caches.match('./index.html'))
    )
  );
});
