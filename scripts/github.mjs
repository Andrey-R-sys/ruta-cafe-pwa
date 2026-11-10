// Credenciales exclusivamente en memoria mediante Git Credential Manager.
import { spawnSync } from 'node:child_process';
process.env.GIT_TERMINAL_PROMPT = '0';
process.env.GCM_INTERACTIVE = 'never';
const result = spawnSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', windowsHide: true
});
const credential = Object.fromEntries((result.stdout || '').trim().split('\n').map(line => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim()];
}));
if (!credential.password) throw new Error('No hay una credencial GitHub disponible en Git Credential Manager.');
export async function api(route, options = {}) {
  const response = await fetch('https://api.github.com' + route, {
    ...options, headers: { Authorization: `Bearer ${credential.password}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...options.headers }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${body.message}`);
  return body;
}
if (process.argv[2] === 'status') {
  const user = await api('/user');
  console.log(JSON.stringify({ login: user.login, id: user.id, email: user.email }));
}
