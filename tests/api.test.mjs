import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import webpush from 'web-push';
import sharp from 'sharp';
import { createApp } from '../server/app.js';
import { createStore } from '../server/store.js';
let server, base, directory;
const keys = webpush.generateVAPIDKeys();
const pushConfig = { ...keys, subject: 'mailto:test@example.com', adminKey: 'test-admin-key' };
let pushError;
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ruta-api-'));
  server = createApp({ dataDir: directory, pushConfig, sendNotification: async () => { if (pushError) throw pushError; } }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});
after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await fs.rm(directory, { recursive: true }); });
const send = (route, value, extra = {}) => fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(value) });
test('API catálogo y SSR con contenido sin JavaScript', async () => {
  const catalog = await (await fetch(base + '/api/catalog')).json();
  assert.equal(catalog.length, 6);
  const html = await (await fetch(base + '/ficha/lumbre')).text();
  assert.match(html, /data-ssr/); assert.match(html, /Una barra pequeña/);
  assert.equal((await fetch(base + '/ficha/no-existe')).status, 404);
});
test('Reseñas válidas, duplicados concurrentes y persistencia', async () => {
  const review = { id: randomUUID(), cafeId: 'lumbre', name: 'Persona de prueba', text: '<script>alert(1)</script> Excelente café.', rating: 5 };
  const responses = await Promise.all(Array.from({ length: 4 }, () => send('/api/reviews', review)));
  assert.deepEqual(responses.map(r=>r.status).sort(), [200,200,200,201]);
  const reviews = await (await fetch(base + '/api/reviews?cafeId=lumbre')).json();
  assert.equal(reviews.filter(r=>r.id===review.id).length, 1);
  assert.equal((await createStore(directory).read()).reviews.length, 1);
});
test('Rechazo de datos inválidos, JSON malformado y origen ajeno', async () => {
  assert.equal((await send('/api/reviews', { rating: 9 })).status, 400);
  assert.equal((await fetch(base+'/api/reviews', {method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
  assert.equal((await send('/api/reviews', {}, { Origin:'https://untrusted.example' })).status,403);
});
test('Push: suscripción válida, deduplicación, administración y baja de expiradas', async () => {
  assert.equal((await (await fetch(base+'/api/push/key')).json()).enabled,true);
  assert.equal((await send('/api/push/subscribe', {endpoint:'http://localhost/internal'})).status,400);
  const sub = { endpoint:'https://fcm.googleapis.com/fcm/send/test-only', keys:{ p256dh: Buffer.alloc(65,1).toString('base64url'), auth:Buffer.alloc(16,1).toString('base64url') } };
  assert.equal((await send('/api/push/subscribe',sub)).status,201);
  await send('/api/push/subscribe',sub);
  assert.equal((await createStore(directory).read()).subscriptions.length,1);
  assert.equal((await send('/api/push/send', {})).status,401);
  assert.deepEqual(await (await send('/api/push/send', {}, {Authorization:'Bearer test-admin-key'})).json(),{sent:1,failed:0});
  pushError = {statusCode:410};
  assert.deepEqual(await (await send('/api/push/send', {}, {Authorization:'Bearer test-admin-key'})).json(),{sent:0,failed:1});
  assert.equal((await createStore(directory).read()).subscriptions.length,0);
});
test('Manifiesto y dimensiones PNG reales', async () => {
  const manifest = await (await fetch(base+'/manifest.json')).json();
  assert.equal(manifest.display,'standalone'); assert.equal(manifest.scope,'./');
  for (const icon of manifest.icons) { const info = await sharp(`public/${icon.src}`).metadata(); assert.equal(`${info.width}x${info.height}`,icon.sizes); }
});
