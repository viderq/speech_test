/*  Service Worker: Aviation Briefings demo  */
const CACHE = 'briefings-cache-v1';

/*  ⚠️ в кэш кладём ТОЛЬКО локальные файлы (одного origin)  */
const PRECACHE = [
  './',               // fallback → index.html
  './index.html',
  './manifest.json',  // если добавите
  // локальные картинки / аудио, если появятся:
  // './img/loopbelt_infant.png',
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', e => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then(all =>
      Promise.all(all.map(n => (n === CACHE ? null : caches.delete(n))))
    )
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', e => {
  const { request } = e;

  /* навигация → всегда index.html */
  if (request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
            .then(r => r || fetch(request))
    );
    return;
  }

  /* другие запросы: Cache-First */
  e.respondWith(
    caches.match(request).then(r => r ||
      fetch(request).then(net => {
        /* кэшируем ТОЛЬКО ответы того же origin */
        if (net.ok && net.url.startsWith(self.location.origin)) {
          caches.open(CACHE).then(c => c.put(request, net.clone()));
        }
        return net;
      })
    )
  );
});
