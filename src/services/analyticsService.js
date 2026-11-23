/**
 * SYNCRO — Servicio de Analítica CRO Respetuosa con la Privacidad
 * Compatible con PostHog, Plausible y Mixpanel, además de telemetría local
 * para seguimiento del embudo comercial y KPIs de inversión (D7/D30, activación).
 */

const FUNNEL_KEY = 'syncro_cro_events_v1';
const MAX_LOCAL_EVENTS = 200;

function readEvents() {
  try {
    return JSON.parse(localStorage.getItem(FUNNEL_KEY) || '[]');
  } catch {
    return [];
  }
}

function storeLocalEvent(eventName, props) {
  try {
    const list = readEvents();
    list.push({
      event: eventName,
      props,
      ts: Date.now(),
      path: typeof location !== 'undefined' ? location.pathname : '/',
    });
    if (list.length > MAX_LOCAL_EVENTS) list.splice(0, list.length - MAX_LOCAL_EVENTS);
    localStorage.setItem(FUNNEL_KEY, JSON.stringify(list));
  } catch {
    // Storage bloqueado: degradación silenciosa
  }
}

export const analyticsService = {
  /**
   * Registra un evento del embudo CRO:
   * - landing_visit
   * - cta_click
   * - signup_completed
   * - onboarding_completed
   * - first_checkin
   * - first_block_completed
   * - b2b_demo_requested
   * - retention_d7 / retention_d30
   */
  track(eventName, properties = {}) {
    const safeProps = { ...properties, ts_iso: new Date().toISOString() };
    storeLocalEvent(eventName, safeProps);

    if (typeof window === 'undefined') return;

    try {
      // 1. PostHog
      if (window.posthog && typeof window.posthog.capture === 'function') {
        window.posthog.capture(eventName, safeProps);
      }
      // 2. Plausible
      if (typeof window.plausible === 'function') {
        window.plausible(eventName, { props: safeProps });
      }
      // 3. Mixpanel
      if (window.mixpanel && typeof window.mixpanel.track === 'function') {
        window.mixpanel.track(eventName, safeProps);
      }
    } catch {
      // Nunca interrumpir la UX por errores de analítica
    }
  },

  /**
   * Registra un evento de hito único (ej. first_checkin, first_block_completed).
   */
  trackOnce(eventName, properties = {}) {
    const flagKey = `syncro_once_${eventName}`;
    try {
      if (localStorage.getItem(flagKey)) return;
      localStorage.setItem(flagKey, String(Date.now()));
    } catch {
      // continuar
    }
    this.track(eventName, properties);
  },

  /**
   * Evalúa hitos de retención D7 y D30 a partir de la fecha de registro.
   */
  checkRetention(createdAt) {
    if (!createdAt) return;
    const days = Math.floor((Date.now() - createdAt) / 86400000);
    if (days >= 7) this.trackOnce('retention_d7', { days_since_signup: days });
    if (days >= 30) this.trackOnce('retention_d30', { days_since_signup: days });
  },

  getLocalFunnelLog() {
    return readEvents();
  },
};
