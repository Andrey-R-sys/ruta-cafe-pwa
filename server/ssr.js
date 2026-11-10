import fs from 'node:fs/promises';
import { detail } from '../public/js/templates.js';
export async function renderDocument(cafe, base = '/') {
  const shell = await fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  return shell.replace('<head>', `<head><base href="${base}">`).replace('<title>Ruta Café · Encuentra tu próxima pausa</title>', `<title>${cafe.name} · Ruta Café</title>`).replace(/<main id="view"[\s\S]*?<\/main>/, `<main id="view" tabindex="-1">${detail(cafe, true)}</main><script id="ssr-data" type="application/json">${JSON.stringify(cafe).replace(/</g, '\\u003c')}</script>`);
}
