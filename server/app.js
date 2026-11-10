import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, version: '1.0.0' }));
  app.use(express.static(path.join(root, 'public'), { etag: true }));
  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.status === 400 ? 'JSON inválido' : 'Error de servidor' }));
  return app;
}
