/**
 * SYNCRO — Controlador de Tema (Modo Claro y Modo Oscuro)
 * Detecta automáticamente la preferencia del sistema (prefers-color-scheme) si el usuario
 * aún no eligió manualmente, persiste la elección manual en localStorage ("syncro_theme"),
 * sincroniza entre pestañas y actualiza la meta theme-color móvil.
 */

const THEME_STORAGE_KEY = 'syncro_theme';

function getSystemTheme() {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch (_) {}
  return 'dark';
}

function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (_) {}
  return null;
}

export function getTheme() {
  const saved = getSavedTheme();
  if (saved) return saved;
  return getSystemTheme();
}

export function applyTheme(theme, { persist = true } = {}) {
  const next = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (_) {}
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', next === 'light' ? '#F4F7FB' : '#0B132B');
  }

  const isLight = next === 'light';
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(isLight));
    btn.setAttribute('title', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
    btn.setAttribute('aria-label', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  });
  document.querySelectorAll('[data-theme-icon]').forEach((el) => {
    el.textContent = isLight ? '🌙' : '☀️';
  });
  document.querySelectorAll('[data-theme-label]').forEach((el) => {
    el.textContent = isLight ? 'Modo oscuro' : 'Modo claro';
  });

  return next;
}

export function toggleTheme() {
  return applyTheme(getTheme() === 'light' ? 'dark' : 'light', { persist: true });
}

export function initTheme() {
  applyTheme(getTheme(), { persist: false });

  requestAnimationFrame(() => {
    document.documentElement.setAttribute('data-theme-ready', '1');
  });

  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    if (btn.dataset.themeBound) return;
    btn.dataset.themeBound = '1';
    btn.addEventListener('click', () => {
      toggleTheme();
    });
  });

  // Si el usuario no eligió tema manual, acompañar cambios automáticos del sistema
  try {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onSysChange = (e) => {
      if (!getSavedTheme()) {
        applyTheme(e.matches ? 'light' : 'dark', { persist: false });
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', onSysChange);
    else if (mq.addListener) mq.addListener(onSysChange);
  } catch (_) {}

  window.addEventListener('storage', (e) => {
    if (e.key === THEME_STORAGE_KEY) {
      applyTheme(e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : getSystemTheme(), { persist: false });
    }
  });
}
