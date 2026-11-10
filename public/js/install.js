import { toast } from './config.js';
let promptEvent;
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
function draw() {
  const slot = document.querySelector('#install-slot');
  if (!slot) return;
  slot.innerHTML = `<aside class="offline-banner"><span class="badge" aria-hidden="true">↧</span><div><strong>${installed() ? 'Tu pausa ya tiene un lugar en tu pantalla.' : 'Lleva Ruta Café contigo.'}</strong><p>${installed() ? 'Estás usando la app instalada.' : 'Instala la app: ligera, sin tiendas y siempre a mano.'}</p></div>${installed() ? '' : '<button class="button secondary" id="install">Instalar app</button>'}</aside>`;
  document.querySelector('#install')?.addEventListener('click', async () => {
    if (!promptEvent) { toast('Abre el menú del navegador y elige «Instalar aplicación» o «Agregar a pantalla de inicio». En iOS: Compartir → Añadir a inicio.'); return; }
    try { await promptEvent.prompt(); await promptEvent.userChoice; } catch (error) { toast(error.message); }
    promptEvent = null; draw();
  });
}
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); promptEvent = event; draw(); });
window.addEventListener('appinstalled', () => { promptEvent = null; toast('Ruta Café ya está instalada.'); draw(); });
window.addEventListener('viewready', draw);
draw();
