export const APP_BASE = new URL('../', import.meta.url);
export const asset = path => new URL(path, APP_BASE).href;
export function apiBase() {
  try { const saved = localStorage.getItem('ruta-api'); if (saved) return saved; } catch {}
  return location.hostname.endsWith('github.io') ? null : location.origin;
}
export function apiUrl(path) { const base = apiBase(); return base ? `${base}${path}` : null; }
export function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message; el.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.hidden = true; }, 5000);
}
