/**
 * SYNCRO — Gestor Unificado de Modales, Accesibilidad (Focus Trap) y Toasts
 * Garantiza atrapado de teclado (Tab / Shift+Tab), retorno de foco al cerrar
 * y cierre seguro con Escape en todos los overlays de la aplicación.
 */

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let toastTimer = null;
let infoAction = null;
let initialized = false;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3400);
}

export function getOpenModals() {
  return $$('.overlay:not(.hidden), .emergency-overlay:not(.hidden), .auth-overlay:not([hidden])');
}

export function openOverlay(el) {
  if (!el) return;
  el._returnFocus = document.activeElement;
  el.classList.remove('hidden');
  if (el.hasAttribute('hidden')) el.hidden = false;
  const firstFocusable =
    el.querySelector('input:not([type="radio"]):not([type="checkbox"]):not([disabled]), button:not([disabled])') || el;
  requestAnimationFrame(() => firstFocusable.focus?.());
}

export function closeOverlay(el) {
  if (!el) return;
  el.classList.add('hidden');
  const back = el._returnFocus;
  el._returnFocus = null;
  if (back && document.contains(back)) {
    requestAnimationFrame(() => back.focus?.());
  }
}

export function openInfo(title, html, ok = 'Entendido', onOk = null) {
  const titleEl = $('#infoTitle');
  const bodyEl = $('#infoBody');
  const okBtn = $('#closeInfo');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = html;
  if (okBtn) okBtn.textContent = ok;
  infoAction = onOk;
  openOverlay($('#infoModal'));
}

export function celebrate(title, text, emoji = '🎉') {
  const titleEl = $('#missionModalTitle');
  const textEl = $('#missionModalText');
  const emojiEl = $('#celebEmoji');
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;
  if (emojiEl) emojiEl.textContent = emoji;
  openOverlay($('#missionModal'));
}

export function initModals({ isTourActive = () => false } = {}) {
  if (initialized) return;
  initialized = true;

  // Focus trap unificado para todos los modales abiertos
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (isTourActive()) return;
      const top = getOpenModals().pop();
      if (!top) return;
      const focusables = $$(FOCUSABLE, top).filter((x) => x.offsetParent !== null);
      if (!focusables.length) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!top.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    if (e.key === 'Escape') {
      const top = $$('.overlay:not(.hidden), .emergency-overlay:not(.hidden)').pop();
      if (!top) return;
      // #onboarding y #blockModal requieren decisión explícita del usuario
      if (top.id === 'onboarding' || top.id === 'blockModal') return;
      closeOverlay(top);
    }
  });

  // Cierre por clic en backdrop
  $$('.overlay').forEach((overlay) => {
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay && overlay.id !== 'onboarding') {
        closeOverlay(overlay);
      }
    });
  });

  $('#closeInfo')?.addEventListener('click', () => {
    if (infoAction && infoAction() === false) return;
    infoAction = null;
    closeOverlay($('#infoModal'));
  });

  $('#closeMissionModal')?.addEventListener('click', () => closeOverlay($('#missionModal')));
}
