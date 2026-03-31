// Cantar e Rezar — Service Worker v5
const CACHE = 'cantar-e-rezar-v5';

// Risorse da pre-cachare all'installazione
const PRECACHE_URLS = [
  '/cantar-e-rezar/',
  '/cantar-e-rezar/index.html',
];

// ── INSTALL: pre-cache la pagina ──────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      for (const url of PRECACHE_URLS) {
        try {
          const res = await fetch(url, { credentials: 'same-origin' });
          if (res.ok) await cache.put(url, res);
        } catch (_) {}
      }
      // Font Google (opaque OK per i font)
      try {
        const fontUrl = 'https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap';
        const fres = await fetch(new Request(fontUrl, { mode: 'no-cors' }));
        await cache.put(fontUrl, fres);
      } catch (_) {}
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: pulisce vecchie cache ──────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // 1. Navigazione → cache-first, poi network
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(req)
        .then(cached => cached || caches.match('/cantar-e-rezar/'))
        .then(cached => {
          if (cached) return cached;
          return fetch(req).then(res => {
            if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
            return res;
          });
        })
    );
    return;
  }

  // 2. Font Google → cache-first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(req).then(cached => cached ||
        fetch(new Request(req, { mode: 'no-cors' })).then(res => {
          caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => new Response('', { status: 408 }))
      )
    );
    return;
  }

  // 3. Tutto il resto → stale-while-revalidate
  e.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
      return cached || fresh;
    })
  );
});
