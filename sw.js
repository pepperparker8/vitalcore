const CACHE = 'vitalcore-v75';
const SHELL = ['./', './index.html', './manifest.json', './css/app.css', './js/core.js', './js/sync.js', './js/log.js', './js/today.js', './js/strength.js', './js/settings.js', './js/render.js', './js/recovery.js','./js/chart.js','./js/form.js','./js/trends.js', './js/progress.js', './js/plan.js', './js/review.js', './js/coach.js', './js/health.js', './js/digest.js', './js/insights.js', './js/app.js', './assets/mark.svg', './icon-maskable-512.png', './icon-96.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: open instantly from cache, refresh in the background so updates arrive on the next open.
// Supabase and other API calls are never handled here (different origin) and always go to the network.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isShell = url.origin === location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (e.request.method !== 'GET' || !(isShell || isFont)) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
      return hit || net;
    })
  );
});
