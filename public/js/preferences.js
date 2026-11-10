export function preference(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`ruta-${key}`)) ?? fallback; } catch { return fallback; }
}
export function savePreference(key, value) { localStorage.setItem(`ruta-${key}`, JSON.stringify(value)); }
export function applyTheme(theme = preference('theme', 'light')) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  document.querySelector('#theme')?.setAttribute('aria-label', theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro');
}
applyTheme();
document.querySelector('#theme')?.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try { savePreference('theme', theme); } catch { /* El tema funciona aunque el almacenamiento esté bloqueado. */ }
});
