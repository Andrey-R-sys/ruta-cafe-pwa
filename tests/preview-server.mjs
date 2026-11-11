import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ruta-e2e-'));
const app = createApp({ dataDir: directory });
let version = '1.0.0';
http.createServer(async (req,res) => {
  if (req.url === '/__test/update') { version = `test-${Date.now()}`; res.end('OK'); return; }
  if (req.url === '/sw.js') { res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' }); res.end((await fs.readFile('public/sw.js','utf8')).replace("const VERSION = '1.0.0'",`const VERSION = '${version}'`)); return; }
  app(req,res);
}).listen(3100);
process.on('SIGTERM', async () => { await fs.rm(directory, {recursive:true,force:true}); process.exit(); });
