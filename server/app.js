import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { renderDocument } from './ssr.js';
import { createStore } from './store.js';
import { reviewRoutes } from './reviews.js';
import { pushRoutes } from './push.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function createApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    if (origin && origin !== `${req.protocol}://${req.get('host')}` && !allowed.includes(origin)) return res.status(403).json({ error: 'Origen no permitido.' });
    if (origin) res.set({ 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, version: '1.0.0' }));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/data/catalog.json'), 'utf8'));
  const store = createStore(options.dataDir);
  reviewRoutes(app, store, catalog);
  pushRoutes(app, store, options);
  app.get('/api/catalog', (_req, res) => res.json(catalog));
  app.get('/ficha/:id', async (req, res) => {
    const cafe = catalog.find(item => item.id === req.params.id);
    if (!cafe) return res.status(404).send('Cafetería no encontrada');
    res.send(await renderDocument(cafe));
  });
  app.use(express.static(path.join(root, 'public'), { etag: true, setHeaders(res, file) { if (file.endsWith('sw.js')) res.set('Cache-Control', 'no-cache'); } }));
  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.status === 400 ? 'JSON inválido' : 'Error de servidor' }));
  return app;
}
