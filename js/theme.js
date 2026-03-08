import { storageGet, storageSet } from './storage.js';
// ─── THEME ───────────────────────────────────────────────────────────────────
const THEMES = ['light', 'slate', 'dark'];

export function applyTheme(theme, redrawFn) {
  if (!THEMES.includes(theme)) theme = 'light';
  document.documentElement.setAttribute('data-theme', theme);
  storageSet('surebetTheme', theme);

  document.querySelectorAll('.theme-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.theme === theme)
  );

  // Redesenha gráficos para aplicar nova cor de grid
  if (typeof redrawFn === 'function') redrawFn();
}

export function initTheme(redrawFn) {
  const saved = storageGet('surebetTheme', 'light');
  applyTheme(saved, null); // sem redraw na inicialização (dados ainda não carregados)

  document.getElementById('themeSwitcher')?.addEventListener('click', e => {
    const btn = e.target.closest('.theme-btn');
    if (btn) applyTheme(btn.dataset.theme, redrawFn);
  });
}