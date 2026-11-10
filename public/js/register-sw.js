export const swReady = 'serviceWorker' in navigator
  ? navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' }).then(() => navigator.serviceWorker.ready)
  : Promise.resolve(null);
swReady.catch(error => console.warn('Service worker no disponible:', error.message));
