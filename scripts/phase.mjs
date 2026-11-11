import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createApp, root } from '../server/app.js';
const phase = Number(process.argv[2]);
assert(Number.isInteger(phase) && phase >= 0 && phase <= 13);
const server = createApp().listen(0);
await new Promise(resolve => server.once('listening', resolve));
const base = `http://localhost:${server.address().port}`;
const checks = [];
async function check(route, expected, type = 'text') {
  const response = await fetch(base + route);
  assert.equal(response.status, 200, route);
  const body = type === 'json' ? await response.json() : await response.text();
  if (expected) assert(type === 'json' ? expected(body) : body.includes(expected), route);
  checks.push(`GET ${route}: 200 y contenido correcto`);
}
try {
  await check('/api/health', value => value.ok, 'json');
  await check('/', 'Ruta Café');
  if (phase >= 1) await check('/css/styles.css', ':root');
  if (phase >= 2) {
    await check('/manifest.json', value => value.icons.length >= 3 && value.scope === './', 'json');
    await check('/icons/icon-192.png');
    await check('/icons/icon-512.png');
  }
  if (phase >= 3) await check('/sw.js', "'install'");
  if (phase >= 4) {
    await check('/api/catalog', value => value.length === 6, 'json');
    await check('/ficha/lumbre', 'data-ssr');
  }
  if (phase >= 5) await check('/js/install.js', 'beforeinstallprompt');
  if (phase >= 6) await check('/js/db.js', 'indexedDB.open');
  if (phase >= 7) await check('/offline.html', 'Sin conexión');
  if (phase >= 8) await check('/api/reviews?cafeId=lumbre', Array.isArray, 'json');
  if (phase >= 9) await check('/sw.js', 'SKIP_WAITING');
  if (phase >= 10) await check('/api/push/key', value => 'enabled' in value, 'json');
  if (phase >= 11) await check('/js/device.js', 'geolocation');
  if (phase === 12) {
    const result = spawnSync(process.execPath, ['--test', 'tests/api.test.mjs'], { encoding: 'utf8', cwd: root });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    await fs.writeFile('docs/evidencias/api.tap', result.stdout);
    const browser = JSON.parse(await fs.readFile('docs/evidencias/playwright-results.json','utf8'));
    assert.equal(browser.stats.unexpected, 0);
    assert.equal(browser.stats.expected, 9);
    const install = JSON.parse(await fs.readFile('docs/evidencias/instalacion.json','utf8'));
    assert.equal(install.installed, true);
    checks.push('Suite API: aprobada');
    checks.push('9 pruebas de navegador aprobadas e instalación en perfil temporal confirmada');
  }
  await fs.mkdir('docs', { recursive: true });
  const history = JSON.parse(await fs.readFile('docs/fases.json', 'utf8').catch(() => '[]'));
  history.push({ phase, verifiedAt: new Date().toISOString(), checks });
  await fs.writeFile('docs/fases.json', JSON.stringify(history, null, 2) + '\n');
  console.log(`Fase ${phase}: ${checks.length} verificaciones aprobadas.`);
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
