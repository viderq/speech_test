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
/* ---------- FETCH ---------- */
self.addEventListener('fetch', e => {
  const { request } = e;

  if (request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
        .then(r => r || fetch(request))
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(r => {
      return r || fetch(request).then(net => {
        const netClone = net.clone();
        if (net.ok && net.url.startsWith(self.location.origin)) {
          caches.open(CACHE)
            .then(c => c.put(request, netClone))
            .catch(err => console.warn('[SW] Cache put failed:', err));
        }
        return net;
      }).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
