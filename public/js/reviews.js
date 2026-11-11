import './db.js';
import './sync.js';
import { apiBase, apiUrl, toast } from './config.js';
import { escape } from './templates.js';
export async function synchronize() {
  if (!navigator.onLine) return;
  try {
    const sent = await RouteSync.flush();
    if (sent) { toast(`${sent} reseña${sent > 1 ? 's' : ''} sincronizada${sent > 1 ? 's' : ''}.`); window.dispatchEvent(new Event('reviewssynced')); }
  } catch { /* La cola persiste y se reintentará. */ }
}
export async function mountReviews(cafe) {
  const container = document.querySelector('#reviews');
  if (!container) return;
  container.innerHTML = `<h2>Una buena experiencia se comparte.</h2><p>Escribe ahora, incluso sin conexión.</p><form id="review-form" class="form-grid"><label>Tu nombre<input name="name" required minlength="2" maxlength="60" autocomplete="given-name"></label><label>Calificación<select name="rating"><option value="5">5 - Me encantó</option><option value="4">4 - Muy bien</option><option value="3">3 - Bien</option><option value="2">2 - Regular</option><option value="1">1 - Puede mejorar</option></select></label><label>Tu reseña<textarea name="text" required minlength="10" maxlength="1000" placeholder="¿Qué hace especial a este lugar?"></textarea></label><button class="button" type="submit">Guardar reseña</button></form><p class="small-label">${apiBase() ? 'Se guarda primero en este dispositivo y después en el servidor.' : 'Modo GitHub Pages: configura un servidor en Ajustes para enviar tus reseñas.'}</p><h2>Reseñas</h2><div id="review-list" aria-live="polite"></div>`;
  async function list() {
    let remote = [];
    const endpoint = apiUrl(`/api/reviews?cafeId=${cafe.id}`);
    if (navigator.onLine && endpoint) {
      try {
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(2500) });
        if (response.ok) {
          remote = await response.json();
          for (const review of remote) await RouteDB.put('reviews', { ...review, status: 'sent' });
        }
      } catch {}
    }
    const reviews = (await RouteDB.all('reviews')).filter(review => review.cafeId === cafe.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    if (!container.isConnected) return;
    container.querySelector('#review-list').innerHTML = reviews.length ? reviews.map(review => `<article class="review"><strong>${escape(review.name)}</strong> <span class="rating">${'★'.repeat(review.rating)}</span><p>${escape(review.text)}</p><small>${review.status === 'sent' ? 'Sincronizada' : review.status === 'blocked' ? escape(review.error) : 'Guardada en este dispositivo · Pendiente de sincronizar'} · ${new Date(review.createdAt).toLocaleDateString('es-MX')}</small></article>`).join('') : '<p>Aún no hay reseñas. Comparte la primera pausa.</p>';
  }
  container.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    const fields = new FormData(form);
    const name = fields.get('name').trim(), text = fields.get('text').trim();
    if (name.length < 2 || text.length < 10) { toast('Escribe tu nombre y una reseña de al menos 10 caracteres.'); return; }
    const button = form.querySelector('button'); button.disabled = true;
    try {
      await RouteDB.queueReview({ id: crypto.randomUUID(), cafeId: cafe.id, name, text, rating: Number(fields.get('rating')), createdAt: new Date().toISOString(), status: 'pending', apiBase: apiBase() });
      form.reset(); toast('Reseña guardada en tu dispositivo.'); await list();
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration?.sync) await registration.sync.register('sync-reviews').catch(() => {});
      await synchronize(); await list();
    } catch { toast('No se pudo guardar. Comprueba el almacenamiento disponible e inténtalo de nuevo.'); }
    finally { button.disabled = false; }
  });
  window.addEventListener('reviewssynced', list, { once: true });
  await list();
}
window.addEventListener('online', synchronize);
document.addEventListener('visibilitychange', () => { if (!document.hidden) synchronize(); });
navigator.serviceWorker?.addEventListener('message', event => { if (event.data?.type === 'REVIEWS_SYNCED') window.dispatchEvent(new Event('reviewssynced')); });
synchronize();
