import { asset, apiUrl, apiBase, toast } from './config.js';
import { card, detail, escape } from './templates.js';
import './db.js';
import { preference, savePreference } from './preferences.js';
import { mountReviews, synchronize } from './reviews.js';
import { localNotification, enablePush, disablePush } from './notifications.js';
export let catalog = [];
let filter = 'Todos';
let query = '';
export function favorites() { const values = preference('favorites', []); return Array.isArray(values) ? values : []; }
export async function loadCatalog() {
  try {
    const remote = apiUrl('/api/catalog');
    const response = await fetch(remote || asset('data/catalog.json'), { signal: AbortSignal.timeout(4500) });
    if (!response.ok) throw new Error('Catálogo remoto no disponible');
    const data = await response.json();
    if (!Array.isArray(data) || !data.length || data.some(c => !/^[a-z0-9-]+$/.test(c.id) || !/^images\/[a-z0-9-]+\.svg$/.test(c.image))) throw new Error('Catálogo inválido');
    catalog = data;
    await RouteDB.put('catalog', { id: 'snapshot', data, updatedAt: Date.now() }).catch(() => {});
  } catch {
    const saved = await RouteDB.get('catalog', 'snapshot').catch(() => null);
    if (saved) catalog = saved.data;
    else {
      const response = await fetch(asset('data/catalog.json'));
      if (!response.ok) throw new Error('No pudimos recuperar el catálogo. Visita la app con conexión una vez.');
      catalog = await response.json();
    }
  }
  return catalog;
}
const hero = () => `<section class="hero"><div class="hero-copy"><p class="eyebrow">PEQUEÑAS PAUSAS, GRANDES LUGARES</p><h1>Tu próxima pausa<br>empieza <em>aquí.</em></h1><p>Cafés con historia, rincones con encanto.<br>Encuentra ese lugar al que querrás volver.</p><a class="button" href="#catalog">Explorar cafeterías <span aria-hidden="true">↗</span></a><p class="hero-foot">⌖ Una selección de rincones en Ciudad de México</p></div><img class="hero-art" src="images/hero.svg" alt="Ilustración de una taza de café junto a una rama de olivo" width="650" height="440"></section>`;
function gridView(favoriteOnly = false, cafes = catalog) {
  const selected = cafes.filter(cafe => (!favoriteOnly || favorites().includes(cafe.id)) && (filter === 'Todos' || cafe.category === filter) && `${cafe.name} ${cafe.area}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
  return selected.length ? selected.map(cafe => card(cafe, favorites())).join('') : '<p class="notice">No hay cafeterías en esta selección. Prueba otro filtro o guarda un favorito.</p>';
}
export function refreshGrid() {
  const grid = document.querySelector('#catalog-grid');
  if (grid) { grid.innerHTML = gridView(location.hash.startsWith('#/favorites')); document.querySelector('#result-count').textContent = `${grid.querySelectorAll('.card').length} lugares`; }
}
export async function render() {
  const route = location.hash.slice(1) || '/';
  if (route === 'catalog') { document.querySelector('#catalog')?.scrollIntoView({ behavior: 'smooth' }); return; }
  const view = document.querySelector('#view');
  if (!view) return;
  document.querySelectorAll('[data-nav]').forEach(a => a.toggleAttribute('aria-current', false));
  const nav = document.querySelector(`[data-nav="${route === '/near' ? 'near' : route === '/favorites' ? 'favorites' : 'home'}"]`);
  nav?.setAttribute('aria-current', 'page');
  if (route.startsWith('/cafe/')) {
    const cafe = catalog.find(item => item.id === route.split('/')[2]);
    view.innerHTML = cafe ? detail(cafe) : '<section class="empty"><h1>No encontramos ese lugar</h1><a href="#/">Volver al inicio</a></section>';
    if (cafe) await enhanceDetail(cafe);
  } else if (route === '/settings') {
    view.innerHTML = `<section class="page"><p class="eyebrow">A TU MANERA</p><h1>Tu café, tus preferencias.</h1><div id="settings-content"><p>Ruta Café es un proyecto educativo. Los lugares son ficticios.</p></div></section>`;
    await enhanceSettings();
  } else if (route === '/near') {
    view.innerHTML = '<section class="page"><p class="eyebrow">A UNOS PASOS</p><h1>Cerca de mí</h1><p>Descubre los lugares más próximos a tu ubicación.</p><button id="locate" class="button">Usar mi ubicación</button><p id="location-status" role="status"></p><div class="grid" id="near-grid"></div></section>';
    await enhanceNear();
  } else {
    const favoriteOnly = route === '/favorites';
    view.innerHTML = `${favoriteOnly ? '' : hero()}<section class="content" id="catalog"><div class="section-head"><div><p class="eyebrow">${favoriteOnly ? 'TUS LUGARES DE SIEMPRE' : 'EL CAFÉ ES EL PRETEXTO'}</p><h2>${favoriteOnly ? 'Mis favoritos' : 'Encuentra tu lugar favorito'}</h2><p>${favoriteOnly ? 'Tus próximas pausas, guardadas en este dispositivo.' : 'Una buena taza. Un lugar especial. Sin ir tan lejos.'}</p></div><span class="small-label" id="result-count"></span></div><div class="toolbar"><label class="search"><input id="search" type="search" aria-label="Buscar cafetería o colonia" placeholder="Busca una cafetería o una colonia…" value="${escape(query)}"></label><div class="filters" role="group" aria-label="Filtrar por categoría">${['Todos','Especialidad','Terraza','Panadería'].map(name => `<button class="chip" data-filter="${name}" aria-pressed="${filter === name}">${name}</button>`).join('')}</div></div><div id="catalog-grid" class="grid">${gridView(favoriteOnly)}</div><aside class="offline-banner"><span class="badge" aria-hidden="true">↟</span><div><strong>Tu próxima pausa también va sin conexión.</strong><p>Guarda lugares y escribe reseñas. Se sincronizan cuando vuelves.</p></div><a href="#/settings">Cómo funciona ↗</a></aside><div id="install-slot"></div></section>`;
    refreshGrid();
    document.querySelector('#search').addEventListener('input', e => { query = e.target.value; refreshGrid(); });
    document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(other => other.setAttribute('aria-pressed', String(other === button))); refreshGrid(); }));
    window.dispatchEvent(new Event('viewready'));
  }
  document.title = `Ruta Café · ${route.startsWith('/cafe/') ? catalog.find(c=>c.id===route.split('/')[2])?.name || 'Ficha' : route === '/favorites' ? 'Mis favoritos' : route === '/near' ? 'Cerca de mí' : 'Encuentra tu próxima pausa'}`;
}
export async function enhanceDetail(cafe) { await mountReviews(cafe); }
export async function enhanceSettings() {
  const saved = await RouteDB.get('catalog', 'snapshot').catch(() => null);
  document.querySelector('#settings-content').innerHTML = `<div class="settings-row"><div><strong>Datos en tu dispositivo</strong><p>${saved ? `Catálogo respaldado: ${new Date(saved.updatedAt).toLocaleString('es-MX')}` : 'Se utiliza el catálogo incluido en la app.'}</p><p>Favoritos y tema se guardan en localStorage. Catálogo y reseñas viven en IndexedDB.</p></div></div><p class="notice">Visita la app una vez con conexión para preparar su uso offline. Los datos de este dispositivo se conservan hasta que borres los datos del sitio.</p><div id="extra-settings"></div>`;
  const pending = (await RouteDB.all('outbox')).length;
  document.querySelector('#extra-settings').innerHTML = `<div class="settings-row"><div><strong>Reseñas por sincronizar: <span id="pending-count">${pending}</span></strong><p>Background Sync reintenta cuando el navegador lo permite. También puedes sincronizar aquí.</p></div><button id="sync-now" class="button secondary">Sincronizar ahora</button></div><h2>Notificaciones</h2><p>Solo pediremos permiso cuando pulses un botón.</p><div class="filters"><button id="local-notification" class="button secondary">Probar aviso local</button><button id="enable-push" class="button">Activar push</button><button id="disable-push" class="button secondary">Desactivar push</button></div><h2>Servidor de la app</h2><p>GitHub Pages guarda la app. Un servidor adicional recibe reseñas y envía push. Si no hay uno configurado, tus reseñas permanecen pendientes.</p><form id="api-form" class="form-grid"><label>URL del servidor HTTPS<input name="url" type="url" value="${escape(apiBase() || '')}" placeholder="https://tu-servidor.example" aria-describedby="api-help"></label><small id="api-help">Solo el origen, sin /api. Déjalo vacío para usar la configuración predeterminada.</small><button class="button" type="submit">Guardar servidor</button></form><p class="notice">Los lugares y calificaciones del catálogo son ficticios. Esta app es una demostración educativa.</p>`;
  const action = (id, callback) => document.querySelector(id).addEventListener('click', async event => { event.target.disabled = true; try { await callback(); } catch (error) { toast(error.message); } finally { event.target.disabled = false; } });
  action('#local-notification', localNotification);
  action('#enable-push', enablePush);
  action('#disable-push', disablePush);
  action('#sync-now', async () => { await synchronize(); const count = (await RouteDB.all('outbox')).length; document.querySelector('#pending-count').textContent = count; toast(count ? `Quedan ${count} reseñas pendientes. Comprueba la conexión y el servidor.` : 'Todo está sincronizado.'); });
  document.querySelector('#api-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const value = new FormData(event.target).get('url').trim();
      const endpoint = value ? new URL(value) : null;
      if (endpoint && (endpoint.username || endpoint.password || (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost','127.0.0.1'].includes(endpoint.hostname))))) throw new Error('Usa HTTPS o localhost para desarrollo.');
      if (endpoint) localStorage.setItem('ruta-api', endpoint.origin); else localStorage.removeItem('ruta-api');
      await RouteDB.put('settings', { id: 'api', value: apiBase() });
      toast('Servidor guardado.'); await synchronize();
    } catch (error) { toast(error.message || 'URL inválida.'); }
  });
}
export async function enhanceNear() {}
window.addEventListener('hashchange', () => render().catch(error => toast(error.message)));
document.addEventListener('click', event => {
  const button = event.target.closest('[data-favorite]');
  if (!button) return;
  const id = button.dataset.favorite;
  const values = favorites();
  const saved = !values.includes(id);
  try {
    savePreference('favorites', saved ? [...values, id] : values.filter(value => value !== id));
    button.setAttribute('aria-pressed', String(saved));
    button.textContent = button.classList.contains('favorite') ? saved ? '♥' : '♡' : saved ? '♥ Guardado' : '♡ Guardar favorito';
    toast(saved ? 'Un buen lugar, guardado.' : 'Lugar eliminado de tus favoritos.');
    refreshGrid();
  } catch { toast('El navegador no permite guardar preferencias en este dispositivo.'); }
});
try {
  await loadCatalog();
  if (!document.querySelector('[data-ssr]')) await render();
} catch (error) { document.querySelector('#view').innerHTML = `<section class="empty"><h1>Hagamos una pausa</h1><p>${escape(error.message)}</p><button class="button" onclick="location.reload()">Intentar de nuevo</button></section>`; }
