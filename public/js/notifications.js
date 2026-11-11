import { apiUrl, asset, toast } from './config.js';
function keyBytes(value) { return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length / 4) * 4, '=')), char => char.charCodeAt(0)); }
async function registration() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) throw new Error('Este navegador no admite notificaciones.');
  const current = await navigator.serviceWorker.getRegistration();
  if (!current?.active) throw new Error('La app aún prepara el modo offline. Inténtalo en unos segundos.');
  if (Notification.permission === 'denied') throw new Error('Las notificaciones están bloqueadas. Puedes habilitarlas en los permisos del sitio.');
  if (Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') throw new Error('No se habilitaron las notificaciones.');
  return current;
}
export async function localNotification() {
  const current = await registration();
  await current.showNotification('Una pausa para ti ☕', { body: 'Tu catálogo favorito está listo, incluso sin conexión.', icon: asset('icons/icon-192.png'), badge: asset('icons/icon-192.png'), data: { url: asset('#/') }, tag: 'ruta-local' });
}
export async function enablePush() {
  const endpoint = apiUrl('/api/push/key');
  if (!endpoint) throw new Error('Configura primero un servidor HTTPS en Ajustes.');
  const current = await registration();
  if (!current.pushManager) throw new Error('Web Push no está disponible en este navegador. En iOS, instala primero la app en la pantalla de inicio.');
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('No se pudo consultar el servidor push.');
  const config = await response.json();
  if (!config.enabled) throw new Error('El servidor necesita configurar sus claves VAPID.');
  const subscription = await current.pushManager.getSubscription() || await current.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(config.publicKey) });
  const saved = await fetch(apiUrl('/api/push/subscribe'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription), signal: AbortSignal.timeout(10000) });
  if (!saved.ok) throw new Error('No se pudo guardar la suscripción. Puedes volver a intentarlo.');
  toast('Listo. Recibirás avisos de Ruta Café.');
}
export async function disablePush() {
  const current = await navigator.serviceWorker?.getRegistration();
  const subscription = await current?.pushManager?.getSubscription();
  if (!subscription) { toast('No hay una suscripción activa.'); return; }
  const endpoint = apiUrl('/api/push/subscribe');
  if (endpoint) {
    const response = await fetch(endpoint, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription), signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('El servidor no pudo eliminar la suscripción. Inténtalo con conexión.');
  }
  await subscription.unsubscribe();
  toast('Notificaciones push desactivadas.');
}
