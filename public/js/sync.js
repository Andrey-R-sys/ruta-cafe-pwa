(() => {
  let inFlight;
  async function flush() {
    const setting = await RouteDB.get('settings', 'api');
    const queued = await RouteDB.all('outbox');
    let sent = 0;
    for (const review of queued) {
      const base = review.apiBase || setting?.value;
      if (!base || review.status === 'blocked') continue;
      const response = await fetch(`${base}/api/reviews`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review), signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status)) {
          const rejected = { ...review, status: 'blocked', error: 'El servidor rechazó esta reseña. Revisa su contenido o el servidor configurado.' };
          await RouteDB.queueReview(rejected);
          continue;
        }
        throw new Error('El servidor no está disponible; tu reseña sigue guardada.');
      }
      const accepted = await response.json();
      if (accepted.id !== review.id) throw new Error('El servidor no confirmó la reseña.');
      await RouteDB.acknowledge({ ...review, createdAt: accepted.createdAt });
      sent++;
    }
    return sent;
  }
  globalThis.RouteSync = {
    flush() {
      return inFlight ||= (navigator.locks ? navigator.locks.request('ruta-cafe-sync', flush) : flush()).finally(() => { inFlight = null; });
    }
  };
})();
