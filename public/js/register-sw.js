export const swReady = 'serviceWorker' in navigator
  ? navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' }).then(registration => {
      function offerUpdate() {
        if (!registration.waiting || !navigator.serviceWorker.controller) return;
        let panel = document.querySelector('#update');
        if (!panel) { panel = document.createElement('aside'); panel.id = 'update'; panel.className = 'update'; panel.setAttribute('role', 'status'); document.body.append(panel); }
        panel.innerHTML = '<strong>Una nueva pausa está lista.</strong><p>Hay una versión nueva de Ruta Café. Tus favoritos y reseñas se conservan.</p><button class="button" id="update-now">Actualizar ahora</button> <button class="button secondary" id="update-later">Después</button>';
        panel.querySelector('#update-now').onclick = () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        panel.querySelector('#update-later').onclick = () => panel.remove();
      }
      offerUpdate();
      registration.addEventListener('updatefound', () => {
        registration.installing?.addEventListener('statechange', event => { if (event.target.state === 'installed') offerUpdate(); });
      });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) { registration.update().catch(() => {}); offerUpdate(); } });
      return navigator.serviceWorker.ready;
    })
  : Promise.resolve(null);
swReady.catch(error => console.warn('Service worker no disponible:', error.message));
function connection() {
  const status = document.querySelector('#connection');
  if (!status) return;
  status.textContent = navigator.onLine ? 'En línea' : 'Sin conexión';
  status.classList.toggle('offline', !navigator.onLine);
  status.setAttribute('aria-label', navigator.onLine ? 'El dispositivo tiene conexión de red' : 'Modo sin conexión');
}
addEventListener('online', connection);
addEventListener('offline', connection);
connection();
if ('serviceWorker' in navigator) {
  let controlled = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled && !reloading) { reloading = true; location.reload(); }
    controlled = true;
  });
}
