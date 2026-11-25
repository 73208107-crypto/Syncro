/**
 * SYNCRO — Controlador de Tema (Modo Claro y Modo Oscuro)
 * Persiste la preferencia en localStorage ("syncro_theme"), sincroniza entre pestañas
 * y actualiza todos los botones [data-theme-toggle] y la meta theme-color móvil.
 */

const THEME_STORAGE_KEY = 'syncro_theme';

export function getTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (_) {}
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme, { persist = true } = {}) {
  const next = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (_) {}
  }

  // Actualizar barra de estado móvil (PWA / navegadores móviles)
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', next === 'light' ? '#F4F7FB' : '#0B132B');
  }

  // Actualizar todos los botones e íconos de cambio de tema
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
  return applyTheme(getTheme() === 'light' ? 'dark' : 'light');
}

export function initTheme() {
  applyTheme(getTheme(), { persist: false });

  // Activar transiciones suaves solo después del primer pintado (evita parpadeo al cargar)
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

  window.addEventListener('storage', (e) => {
    if (e.key === THEME_STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
      applyTheme(e.newValue, { persist: false });
    }
  });
}
