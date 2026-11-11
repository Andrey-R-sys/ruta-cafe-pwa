import webpush from 'web-push';
import { createHash, timingSafeEqual } from 'node:crypto';
function validSubscription(value) {
  try {
    const endpoint = new URL(value.endpoint);
    const host = endpoint.hostname;
    return endpoint.protocol === 'https:' && !endpoint.username && !endpoint.password && (!endpoint.port || endpoint.port === '443') && (host === 'fcm.googleapis.com' || host.endsWith('.push.services.mozilla.com') || host.endsWith('.notify.windows.com') || host === 'web.push.apple.com') && Buffer.from(value.keys.p256dh, 'base64url').length === 65 && Buffer.from(value.keys.auth, 'base64url').length === 16;
  } catch { return false; }
}
export function pushRoutes(app, store, options = {}) {
  const config = options.pushConfig || { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY, subject: process.env.VAPID_SUBJECT, adminKey: process.env.PUSH_ADMIN_KEY };
  const enabled = Boolean(config.publicKey && config.privateKey && config.subject && config.adminKey);
  const send = options.sendNotification || webpush.sendNotification;
  app.get('/api/push/key', (_req, res) => res.set('Cache-Control', 'no-store').json({ enabled, publicKey: enabled ? config.publicKey : null }));
  app.post('/api/push/subscribe', async (req, res) => {
    if (!enabled) return res.status(503).json({ error: 'Configura las claves VAPID en el servidor.' });
    const subscription = req.body;
    if (!validSubscription(subscription)) return res.status(400).json({ error: 'Suscripción push inválida.' });
    const record = { endpoint: subscription.endpoint, keys: subscription.keys, expirationTime: subscription.expirationTime || null };
    const ok = await store.write(state => {
      const index = state.subscriptions.findIndex(item => item.endpoint === record.endpoint);
      if (index !== -1) state.subscriptions[index] = record;
      else { if (state.subscriptions.length >= 500) return false; state.subscriptions.push(record); }
      return true;
    });
    res.status(ok ? 201 : 507).json({ ok });
  });
  app.delete('/api/push/subscribe', async (req, res) => {
    const subscription = req.body;
    if (!validSubscription(subscription)) return res.status(400).json({ error: 'Suscripción inválida.' });
    await store.write(state => { state.subscriptions = state.subscriptions.filter(s => !(s.endpoint === subscription.endpoint && s.keys.auth === subscription.keys.auth)); });
    res.json({ ok: true });
  });
  app.post('/api/push/send', async (req, res) => {
    if (!enabled) return res.status(503).json({ error: 'Push no configurado.' });
    const key = req.get('authorization')?.replace(/^Bearer /, '') || '';
    const hash = value => createHash('sha256').update(value).digest();
    if (!timingSafeEqual(hash(key), hash(config.adminKey))) return res.status(401).json({ error: 'Clave de administración requerida.' });
    const { title = 'Tu próxima pausa te espera', body = 'Descubre un nuevo rincón en Ruta Café.', url = './#/' } = req.body || {};
    if (typeof title !== 'string' || title.length > 80 || typeof body !== 'string' || body.length > 240 || typeof url !== 'string' || url.length > 500) return res.status(400).json({ error: 'Mensaje inválido.' });
    const { subscriptions } = await store.read();
    let sent = 0, failed = 0;
    for (const subscription of subscriptions) {
      try {
        await send(subscription, JSON.stringify({ title, body, url }), { TTL: 3600, timeout: 10000, vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey } });
        sent++;
      } catch (error) {
        failed++;
        if ([404,410].includes(error.statusCode)) await store.write(state => { state.subscriptions = state.subscriptions.filter(item => item.endpoint !== subscription.endpoint); });
      }
    }
    res.json({ sent, failed });
  });
}
