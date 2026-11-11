importScripts('./js/db.js', './js/sync.js');
const VERSION = '1.0.0';
const PREFIX = `ruta-cafe-${encodeURIComponent(new URL(self.registration.scope).pathname)}-`;
const SHELL = `${PREFIX}shell-${VERSION}`;
const DATA = `${PREFIX}data-${VERSION}`;
const IMAGES = `${PREFIX}images-${VERSION}`;
const PAGES = `${PREFIX}pages-${VERSION}`;
const url = path => new URL(path, self.registration.scope).href;
const ASSETS = ['./', 'index.html', 'offline.html', 'css/styles.css', 'manifest.json', 'js/register-sw.js', 'js/app.js', 'js/config.js', 'js/templates.js', 'js/preferences.js', 'js/db.js', 'js/install.js', 'data/catalog.json', 'icons/coffee.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'images/hero.svg', ...['lumbre','botanica','miga','sur','calma','olivo'].map(id => `images/${id}.svg`)];
self.addEventListener('install', event => {
  ASSETS.push('js/sync.js', 'js/reviews.js');
  ASSETS.push('js/notifications.js');
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(ASSETS.map(url))));
});
self.addEventListener('push', event => {
  let message = {};
  try { message = event.data?.json() || {}; } catch { message = { body: event.data?.text() }; }
  const destination = new URL(typeof message.url === 'string' ? message.url : './#/', self.registration.scope);
  const safe = destination.origin === self.location.origin && destination.pathname.startsWith(new URL(self.registration.scope).pathname);
  event.waitUntil(self.registration.showNotification(typeof message.title === 'string' ? message.title.slice(0,80) : 'Ruta Café', { body: typeof message.body === 'string' ? message.body.slice(0,240) : 'Tu próxima pausa te espera.', icon: url('icons/icon-192.png'), badge: url('icons/icon-192.png'), tag: 'ruta-push', data: { url: safe ? destination.href : url('./#/') } }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const requested = new URL(event.notification.data?.url || './#/', self.registration.scope);
    const target = requested.origin === self.location.origin && requested.pathname.startsWith(new URL(self.registration.scope).pathname) ? requested.href : url('./#/');
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url.startsWith(self.registration.scope));
    if (existing) { await existing.navigate(target); await existing.focus(); }
    else await self.clients.openWindow(target);
  })());
});
self.addEventListener('sync', event => {
  if (event.tag === 'sync-reviews') event.waitUntil(RouteSync.flush().then(async () => {
    const windows = await self.clients.matchAll({ type: 'window' });
    windows.forEach(client => client.postMessage({ type: 'REVIEWS_SYNCED' }));
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && ![SHELL, DATA, IMAGES, PAGES].includes(key)).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
async function save(name, request, response) {
  if (!response.ok || response.type === 'opaque') return;
  const cache = await caches.open(name);
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - 60)).map(key => cache.delete(key)));
}
async function networkFirst(request, cacheName, navigation = false) {
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(3500) });
    if (!response.ok) throw new Error('Respuesta remota no disponible');
    await save(cacheName, request, response);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (navigation) {
      const path = new URL(request.url).pathname;
      return (await caches.match(url(path === new URL(self.registration.scope).pathname || path.endsWith('/index.html') ? './' : 'offline.html'))) || Response.error();
    }
    return new Response(JSON.stringify({ error: 'Sin conexión' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}
async function staleWhileRevalidate(event) {
  const cached = await caches.match(event.request);
  const refresh = fetch(event.request).then(async response => { await save(IMAGES, event.request, response); return response; });
  event.waitUntil(refresh.catch(() => {}));
  return cached || refresh;
}
self.addEventListener('fetch', event => {
  const request = event.request;
  const target = new URL(request.url);
  if (request.method !== 'GET' || target.origin !== self.location.origin) return;
  if (request.mode === 'navigate') { event.respondWith(networkFirst(request, PAGES, true)); return; }
  if (target.pathname.endsWith('/api/catalog') || target.pathname.endsWith('/data/catalog.json')) { event.respondWith(networkFirst(request, DATA)); return; }
  if (target.pathname.includes('/api/')) return;
  if (/\.(svg|png)$/.test(target.pathname)) { event.respondWith(staleWhileRevalidate(event)); return; }
  // Cache first para el shell; network first para HTML/datos; SWR para imágenes.
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
