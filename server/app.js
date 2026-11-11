import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { renderDocument } from './ssr.js';
import { createStore } from './store.js';
import { reviewRoutes } from './reviews.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function createApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, version: '1.0.0' }));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/data/catalog.json'), 'utf8'));
  const store = createStore(options.dataDir);
  reviewRoutes(app, store, catalog);
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
