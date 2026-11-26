/**
 * SYNCRO — Tutorial Guiado Interactivo por Sección (Spotlight paso a paso)
 * Destaca visualmente las partes más importantes únicamente de la sección en la que
 * está el usuario (Hoy, Enfoque, Calendario, Santuario o Perfil). Aparece la primera
 * vez que entras a esa sección o al pulsar "❔ Tutorial", y puede desactivarse cuando quieras.
 */

import { $, $$, toast } from '../ui/modals.js';

const SEEN_KEY = 'syncro_tutorial_seen_v2';
const DISABLED_KEY = 'syncro_tutorial_disabled_v1';

const SECTION_STEPS = {
  dashboard: [
    {
      selector: '#checkInCard',
      icon: '⚡',
      title: 'Check-in de energía sin culpa',
      desc: 'Ajusta tu nivel de energía y estado de ánimo cada día. Si hoy estás cansado, SYNCRO adapta tus bloques sin exigirte el 100%.',
    },
    {
      selector: '#view-dashboard .card.missions',
      icon: '✅',
      title: 'Misiones diarias alcanzables',
      desc: 'Marca avances pequeños o agrega tus propias tareas. Cada misión completada suma XP y gotas de riego para tu Santuario.',
    },
    {
      selector: '#view-dashboard .card.biome-preview',
      icon: '🌱',
      title: 'Vista rápida de tu Santuario',
      desc: 'Aquí ves cómo responde tu ecosistema andino a tu progreso de hoy y puedes entrar directo al Santuario completo.',
    },
  ],
  focus: [
    {
      selector: '#timerCard',
      icon: '⏱️',
      title: 'Temporizador adaptable',
      desc: 'Inicia un bloque clásico o usa "5 min sin perfección" cuando te cueste arrancar para quitar la presión del reloj.',
    },
    {
      selector: '#view-focus .focus-grid .card:nth-child(2)',
      icon: '🛡️',
      title: 'Escudo Web anti-distracciones',
      desc: 'Te envía un recordatorio suave si sales de la pestaña durante tu bloque para ayudarte a volver sin culpa.',
    },
    {
      selector: '#view-focus .card.sound-card',
      icon: '🎧',
      title: 'Audio bioacústico',
      desc: 'Activa lluvia, bosque o ruido café con volumen independiente para crear tu ambiente de concentración.',
    },
    {
      selector: ['#mobileChatBtn', '.sbot-fab'],
      icon: '🤖',
      title: 'Asistente Bot para tus tareas y estudios',
      desc: '¿Te trabaste con un tema o ejercicio? Toca el botón del Bot para hacer consultas de tus tareas o estudios sin salir de SYNCRO.',
    },
  ],
  focus_started: [
    {
      selector: ['#mobileChatBtn', '.sbot-fab', '#timerCard'],
      icon: '🤖',
      title: 'Usa el Bot para consultar tus tareas o estudios',
      desc: 'Mientras corre tu bloque de enfoque, puedes tocar el botón del Bot para resolver dudas de tus tareas o estudios sin cambiar de pestaña ni distraerte.',
    },
  ],
  calendar: [
    {
      selector: '#view-calendar .view-header',
      icon: '✨',
      title: 'Auto-planificación y exportación',
      desc: 'Usa Auto-planificar para ubicar bloques en tus horas pico o exporta tu semana a Google Calendar o archivo .ics.',
    },
    {
      selector: '#view-calendar .card.cal-card',
      icon: '📅',
      title: 'Agenda visual por energía',
      desc: 'Selecciona una misión de la bandeja y toca la hora en la que quieres trabajarla (en móvil puedes ver Día o Semana).',
    },
    {
      selector: '#view-calendar .card.heat-card',
      icon: '🌿',
      title: 'Jardín de constancia',
      desc: 'Registra tus días activos acumulados para celebrar tu ritmo real sin rachas punitivas.',
    },
  ],
  biome: [
    {
      selector: '#blScene',
      icon: '🏔️',
      title: 'Tu Santuario Andino vivo',
      desc: 'Toca a tus guardianes (alpaca, vicuña, oso o cóndor) para saludarlos, y pulsa el chip de hora arriba para alternar amanecer, día, atardecer y noche.',
    },
    {
      selector: '#biomeLive .bl-controls',
      icon: '💧',
      title: 'Riego animado y crecimiento',
      desc: 'Usa 20 gotas para regar tu santuario con lluvia animada y sumar Puntos Tierra, o desliza la barra para previsualizar etapas.',
    },
    {
      selector: '#view-biome .biome-metrics',
      icon: '🌺',
      title: 'Especies y progreso del ecosistema',
      desc: 'Consulta tus gotas disponibles, Puntos Tierra y las 7 especies nativas que vas desbloqueando con tu constancia.',
    },
  ],
  profile: [
    {
      selector: '#view-profile .card.profile-hero',
      icon: '👤',
      title: 'Tu perfil y guardián',
      desc: 'Aquí ves tu nivel actual, tu guardián andino y tus métricas acumuladas de constancia.',
    },
    {
      selector: '#pfTutorials',
      closestCard: true,
      icon: '⚙️',
      title: 'Control total de preferencias',
      desc: 'Activa o desactiva estos tutoriales guiados automáticos cuando quieras, además de configurar recordatorios y respaldo.',
    },
  ],
};

let activeView = null;
let activeSteps = [];
let activeIdx = 0;
let highlightedEl = null;
let repositionRaf = null;

function getSeenSections() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch (_) {
    return new Set();
  }
}

function markSectionSeen(view) {
  try {
    const seen = getSeenSections();
    seen.add(view);
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
  } catch (_) {}
}

export function isTutorialDisabled() {
  try {
    return localStorage.getItem(DISABLED_KEY) === '1';
  } catch (_) {
    return false;
  }
}

export function setTutorialDisabled(disabled) {
  try {
    localStorage.setItem(DISABLED_KEY, disabled ? '1' : '0');
  } catch (_) {}
  syncTutorialToggleUI();
}

function syncTutorialToggleUI() {
  const cb = $('#pfTutorials');
  if (cb) cb.checked = !isTutorialDisabled();
}

function getActiveView() {
  return document.querySelector('.view.active')?.id?.replace('view-', '') || 'dashboard';
}

function isVisibleEl(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function resolveTarget(step) {
  if (!step || !step.selector) return null;
  const list = Array.isArray(step.selector) ? step.selector : [step.selector];
  let fallback = null;
  for (const sel of list) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const candidate = step.closestCard ? el.closest('.card') || el : el;
    if (isVisibleEl(candidate)) return candidate;
    if (!fallback) fallback = candidate;
  }
  return fallback;
}

function ensureTourElements() {
  let spotlight = $('#secTutSpotlight');
  if (!spotlight) {
    spotlight = document.createElement('div');
    spotlight.id = 'secTutSpotlight';
    spotlight.className = 'sec-tut-spotlight hidden';
    spotlight.setAttribute('aria-hidden', 'true');
    document.body.appendChild(spotlight);
  }

  let card = $('#sectionTutorialCard');
  if (!card) {
    card = document.createElement('aside');
    card.id = 'sectionTutorialCard';
    card.className = 'sec-tut hidden';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Tutorial guiado de la sección actual');
    card.innerHTML = `
      <div class="sec-tut-top">
        <span class="sec-tut-badge" id="secTutStepBadge">Paso 1 de 3</span>
        <div class="sec-tut-dots" id="secTutDots" aria-hidden="true"></div>
        <button type="button" class="icon-btn sec-tut-close" id="secTutClose" aria-label="Cerrar tutorial" title="Cerrar (Esc)">✕</button>
      </div>
      <div class="sec-tut-body">
        <span class="sec-tut-ico" id="secTutIcon" aria-hidden="true">💡</span>
        <div class="sec-tut-copy">
          <strong id="secTutTitle">Guía rápida</strong>
          <p id="secTutDesc"></p>
        </div>
      </div>
      <div class="sec-tut-actions">
        <button type="button" class="btn ghost sm" id="secTutPrev">← Anterior</button>
        <button type="button" class="btn primary sm" id="secTutNext">Siguiente →</button>
      </div>
      <div class="sec-tut-foot">
        <button type="button" class="sec-tut-link" id="secTutDisable">Desactivar tutoriales automáticos</button>
      </div>
    `;
    document.body.appendChild(card);

    $('#secTutClose')?.addEventListener('click', () => hideSectionTutorial(true));
    $('#secTutPrev')?.addEventListener('click', () => {
      if (activeIdx > 0) {
        activeIdx -= 1;
        renderCurrentStep();
      }
    });
    $('#secTutNext')?.addEventListener('click', () => {
      if (activeIdx < activeSteps.length - 1) {
        activeIdx += 1;
        renderCurrentStep();
      } else {
        hideSectionTutorial(true);
      }
    });
  }

  return { spotlight, card };
}

function updateSpotlightPosition() {
  const spotlight = $('#secTutSpotlight');
  if (!spotlight || spotlight.classList.contains('hidden')) return;
  if (!highlightedEl) {
    spotlight.style.opacity = '0';
    return;
  }
  const rect = highlightedEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    spotlight.style.opacity = '0';
    return;
  }
  const pad = 8;
  spotlight.style.opacity = '1';
  spotlight.style.top = `${Math.max(4, rect.top - pad)}px`;
  spotlight.style.left = `${Math.max(4, rect.left - pad)}px`;
  spotlight.style.width = `${Math.min(window.innerWidth - 8, rect.width + pad * 2)}px`;
  spotlight.style.height = `${rect.height + pad * 2}px`;
}

function scheduleReposition() {
  if (repositionRaf) cancelAnimationFrame(repositionRaf);
  repositionRaf = requestAnimationFrame(updateSpotlightPosition);
}

function renderCurrentStep() {
  const { spotlight, card } = ensureTourElements();
  const step = activeSteps[activeIdx];
  if (!step) {
    hideSectionTutorial(true);
    return;
  }

  if (highlightedEl) highlightedEl.classList.remove('sec-tut-highlight');
  highlightedEl = resolveTarget(step);

  if ($('#secTutStepBadge')) $('#secTutStepBadge').textContent = `Paso ${activeIdx + 1} de ${activeSteps.length}`;
  if ($('#secTutIcon')) $('#secTutIcon').textContent = step.icon;
  if ($('#secTutTitle')) $('#secTutTitle').textContent = step.title;
  if ($('#secTutDesc')) $('#secTutDesc').textContent = step.desc;

  if ($('#secTutDots')) {
    $('#secTutDots').innerHTML = activeSteps
      .map((_, i) => `<span class="${i === activeIdx ? 'active' : ''}"></span>`)
      .join('');
  }

  const prevBtn = $('#secTutPrev');
  const nextBtn = $('#secTutNext');
  if (prevBtn) prevBtn.style.visibility = activeIdx === 0 ? 'hidden' : 'visible';
  if (nextBtn) nextBtn.textContent = activeIdx === activeSteps.length - 1 ? 'Finalizar ✓' : 'Siguiente →';

  const disBtn = $('#secTutDisable');
  if (disBtn) {
    disBtn.textContent = isTutorialDisabled() ? 'Reactivar tutoriales automáticos' : 'Desactivar tutoriales automáticos';
    disBtn.onclick = () => {
      if (isTutorialDisabled()) {
        setTutorialDisabled(false);
        toast('Tutoriales automáticos reactivados.');
        disBtn.textContent = 'Desactivar tutoriales automáticos';
      } else {
        setTutorialDisabled(true);
        hideSectionTutorial(true);
        toast('Tutoriales automáticos desactivados. Puedes abrirlos con ❔ o reactivarlos en Perfil.');
      }
    };
  }

  spotlight.classList.remove('hidden');
  card.classList.remove('hidden');

  if (highlightedEl) {
    highlightedEl.classList.add('sec-tut-highlight');
    highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    updateSpotlightPosition();
    setTimeout(updateSpotlightPosition, 260);
    setTimeout(updateSpotlightPosition, 520);
  } else {
    spotlight.style.opacity = '0';
  }
}

export function hideSectionTutorial(markSeen = false) {
  const spotlight = $('#secTutSpotlight');
  const card = $('#sectionTutorialCard');
  if (spotlight) spotlight.classList.add('hidden');
  if (card) card.classList.add('hidden');
  if (highlightedEl) {
    highlightedEl.classList.remove('sec-tut-highlight');
    highlightedEl = null;
  }
  if (markSeen && activeView) {
    markSectionSeen(activeView);
  }
  activeSteps = [];
  activeIdx = 0;
}

export function showSectionTutorial(view = null, { manual = false } = {}) {
  const target = view || getActiveView();
  const steps = SECTION_STEPS[target];
  if (!steps || !steps.length) return;

  if (!manual) {
    if (isTutorialDisabled()) return;
    if (getSeenSections().has(target)) return;
  }

  // Filtrar solo pasos cuyo elemento exista en la sección activa
  const validSteps = steps.filter((s) => resolveTarget(s) !== null);
  if (!validSteps.length) return;

  activeView = target;
  activeSteps = validSteps;
  activeIdx = 0;
  renderCurrentStep();
}

export function initSectionTutorial() {
  ensureTourElements();
  syncTutorialToggleUI();

  // Botones manuales de Tutorial (❔) -> inician el tour guiado SOLO de la sección actual
  $$('[data-replay-tour]').forEach((btn) => {
    if (btn.dataset.tutBound) return;
    btn.dataset.tutBound = '1';
    btn.addEventListener('click', () => {
      showSectionTutorial(getActiveView(), { manual: true });
    });
  });

  // Checkbox en Perfil para activar / desactivar tutoriales automáticos
  const cb = $('#pfTutorials');
  if (cb && !cb.dataset.tutBound) {
    cb.dataset.tutBound = '1';
    cb.addEventListener('change', (e) => {
      const enabled = Boolean(e.target.checked);
      setTutorialDisabled(!enabled);
      if (!enabled) hideSectionTutorial(false);
      toast(enabled ? 'Tutoriales guiados automáticos activados.' : 'Tutoriales guiados automáticos desactivados.');
    });
  }

  // Mostrar tutorial del Bot al iniciar una sesión de Modo Enfoque
  window.addEventListener('syncro:focus-started', () => {
    setTimeout(() => {
      showSectionTutorial('focus_started', { manual: false });
    }, 320);
  });

  // Mantener el spotlight alineado al hacer scroll o redimensionar
  window.addEventListener('scroll', scheduleReposition, { passive: true });
  window.addEventListener('resize', scheduleReposition);

  // Atajos de teclado (Esc, flechas)
  document.addEventListener('keydown', (e) => {
    const card = $('#sectionTutorialCard');
    if (!card || card.classList.contains('hidden')) return;
    if (e.key === 'Escape') hideSectionTutorial(true);
    else if (e.key === 'ArrowRight' && activeIdx < activeSteps.length - 1) {
      activeIdx += 1;
      renderCurrentStep();
    } else if (e.key === 'ArrowLeft' && activeIdx > 0) {
      activeIdx -= 1;
      renderCurrentStep();
    }
  });
}
