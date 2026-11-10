export const swReady = 'serviceWorker' in navigator
  ? navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' }).then(() => navigator.serviceWorker.ready)
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
