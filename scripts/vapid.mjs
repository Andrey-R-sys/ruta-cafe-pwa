import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import webpush from 'web-push';
try { await fs.access('.env'); console.log('.env ya existe: se conserva para no invalidar las suscripciones.'); }
catch {
  const keys = webpush.generateVAPIDKeys();
  await fs.writeFile('.env', `PORT=3000\nALLOWED_ORIGINS=https://andrey-r-sys.github.io\nVAPID_SUBJECT=mailto:andreyrr.ti23@utsjr.edu.mx\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nPUSH_ADMIN_KEY=${crypto.randomBytes(32).toString('hex')}\n`, { flag: 'wx', mode: 0o600 });
  console.log('Claves VAPID y clave de administración guardadas en .env (ignorado por Git).');
}
